from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import LEAD_STATUS_ACTIVE, VALID_LEAD_STATUSES
from app.models.lead import Lead
from app.models.user import User
from app.pipelines.etl import normalize_lead_row
from app.repositories.lead_audit_repository import LeadAuditRepository
from app.repositories.lead_repository import LeadRepository
from app.repositories.notification_repository import NotificationRepository
from app.realtime.events import publish_event
from app.services import excel_sync_service
from app.schemas.lead import DashboardStats, LeadQueryResponse, LeadUpdateBody, TrendPoint

log = logging.getLogger(__name__)

repo = LeadRepository()
notif_repo = NotificationRepository()
audit_repo = LeadAuditRepository()


def _lead_event_payload(lead: Lead) -> Dict[str, Any]:
    return {
        "lead_id": str(lead.id),
        "name": lead.name,
        "phone": lead.phone,
        "status": lead.status,
        "assigned_to": lead.assigned_to,
        "last_contact_at": lead.last_contact_at.isoformat() if lead.last_contact_at else None,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


async def merge_ingested_row(db: AsyncSession, row: Dict[str, Any]) -> Lead:
    clean = normalize_lead_row(row)
    pn = clean.get("phone_normalized") or clean.get("phone")
    if not pn:
        created = await repo.create(db, clean)
        from app.services.sla_service import event_based_sla_check

        await event_based_sla_check(db, created)
        await publish_event("lead.ingested", _lead_event_payload(created))
        return created

    existing = await repo.get_by_merge_key(db, pn)
    if not existing:
        created = await repo.create(db, clean)
        from app.services.sla_service import event_based_sla_check

        await event_based_sla_check(db, created)
        await publish_event("lead.ingested", _lead_event_payload(created))
        return created

    # When the current upload is a snapshot replacement, keep duplicate phone rows
    # that belong to the same batch instead of collapsing them into one lead.
    current_batch_id = clean.get("upload_batch_id")
    if (
        current_batch_id is not None
        and existing.upload_batch_id is not None
        and existing.upload_batch_id == current_batch_id
    ):
        created = await repo.create(db, clean)
        from app.services.sla_service import event_based_sla_check

        await event_based_sla_check(db, created)
        await publish_event("lead.ingested", _lead_event_payload(created))
        return created

    for field in (
        "name",
        "phone",
        "phone_secondary",
        "phone_normalized",
        "source",
        "branch",
        "extra",
        "upload_batch_id",
        "sla_hours_at_ingest",
    ):
        v = clean.get(field)
        if v is not None:
            setattr(existing, field, v)
    if clean.get("notes") is not None:
        existing.notes = clean["notes"]
    if clean.get("external_id") and not existing.external_id:
        existing.external_id = clean.get("external_id")

    await db.flush()
    from app.services.sla_service import event_based_sla_check

    await event_based_sla_check(db, existing)
    await db.refresh(existing)
    log.debug("Merged Excel row into lead %s by phone_normalized", existing.id)
    await publish_event("lead.merged", _lead_event_payload(existing))
    return existing


def _scope_for_user(
    user: User,
    assigned_to: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    if user.role == "admin":
        return assigned_to, None
    return None, user.username


async def list_leads(
    db: AsyncSession,
    *,
    current_user: User,
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    phone_search: Optional[str] = None,
    overdue_only: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> List[Lead]:
    af, sale_exact = _scope_for_user(current_user, assigned_to)
    return await repo.list_leads(
        db,
        assigned_to=af,
        status=status,
        phone_search=phone_search,
        overdue_only=overdue_only,
        sale_username_exact=sale_exact,
        limit=limit,
        offset=offset,
    )


async def get_lead(
    db: AsyncSession, lead_id: UUID, current_user: User
) -> Optional[Lead]:
    lead = await repo.get_by_id(db, lead_id)
    if not lead:
        return None
    if current_user.role == "sale":
        if (lead.assigned_to or "").strip() != current_user.username:
            return None
    return lead


async def get_dashboard_stats(
    db: AsyncSession,
    current_user: User,
    assigned_to: Optional[str] = None,
) -> DashboardStats:
    af, sale_exact = _scope_for_user(current_user, assigned_to)
    from app.pipelines.aggregation import build_dashboard_stats

    return await build_dashboard_stats(
        db,
        repo,
        af,
        sale_exact,
        include_daily_miss_snapshot=current_user.role == "admin",
    )


def _same_utc_day(dt: datetime, day: date) -> bool:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).date() == day


async def query_leads_page(
    db: AsyncSession,
    *,
    current_user: User,
    assigned_to: Optional[str] = None,
    phone_search: Optional[str] = None,
    overdue_only: bool = False,
    statuses: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 20,
) -> LeadQueryResponse:
    from app.services.sla_service import sla_deadline

    af, sale_exact = _scope_for_user(current_user, assigned_to)
    rows = await repo.list_leads(
        db,
        assigned_to=af,
        status=None,
        phone_search=phone_search,
        overdue_only=overdue_only,
        sale_username_exact=sale_exact,
        limit=100000,
        offset=0,
    )

    if statuses:
        status_set = {s.strip() for s in statuses if s and s.strip()}
        rows = [r for r in rows if r.status in status_set]
    if date_from:
        start_dt = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
        rows = [
            r
            for r in rows
            if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc))
            >= start_dt
        ]
    if date_to:
        end_dt = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
        rows = [
            r
            for r in rows
            if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc))
            <= end_dt
        ]

    total = len(rows)
    page = max(1, page)
    limit = max(1, min(limit, 100))
    start = (page - 1) * limit
    items = rows[start : start + limit]

    today = datetime.now(timezone.utc).date()
    uncontacted = sum(1 for r in rows if r.last_contact_at is None and r.status != "closed")
    active_leads = sum(1 for r in rows if r.status == "active")
    contacting = sum(1 for r in rows if r.status == "contacting")
    late = sum(1 for r in rows if r.status == "late")
    contacted_today = sum(1 for r in rows if r.last_contact_at and _same_utc_day(r.last_contact_at, today))
    now = datetime.now(timezone.utc)
    overdue = 0
    for r in rows:
        if r.status == "closed" or r.last_contact_at is not None:
            continue
        created = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
        if sla_deadline(created, r.sla_hours_at_ingest) < now:
            overdue += 1

    daily_misses_today = None
    if current_user.role == "admin":
        try:
            from app.repositories.daily_miss_repository import DailyMissRepository

            daily_misses_today = await DailyMissRepository().sum_for_date(db, today)
        except Exception:
            daily_misses_today = None

    stats = DashboardStats(
        total_leads=total,
        uncontacted=uncontacted,
        active_leads=active_leads,
        contacting=contacting,
        overdue=overdue,
        late=late,
        contacted_today=contacted_today,
        daily_misses_today=daily_misses_today,
    )

    trend_7d: List[TrendPoint] = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = sum(1 for r in rows if _same_utc_day(r.created_at, d))
        trend_7d.append(TrendPoint(day=f"{d.month}/{d.day}", value=count))

    return LeadQueryResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        stats=stats,
        trend_7d=trend_7d,
    )


async def assign_lead(
    db: AsyncSession,
    lead_id: UUID,
    target_username: str,
    actor: User,
) -> Lead:
    lead = await repo.get_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if actor.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can assign leads")
    from app.repositories.user_repository import UserRepository

    urepo = UserRepository()
    target = await urepo.get_by_username(db, target_username.strip())
    if not target or not target.is_active:
        raise HTTPException(status_code=400, detail="Invalid or inactive user")
    if target.role != "sale":
        raise HTTPException(status_code=400, detail="Assignee must be a sale user")

    old_assign = lead.assigned_to
    await repo.update_lead(
        db,
        lead,
        assigned_to=target.username,
        updated_at=datetime.now(timezone.utc),
        updated_by_user_id=actor.id,
    )
    await audit_repo.add(
        db,
        lead_id=lead.id,
        actor_user_id=actor.id,
        action="assign",
        note=f"assignee: {old_assign} -> {target.username}",
    )
    await notif_repo.create(
        db,
        user_id=target.id,
        title="Lead assigned",
        body=f"Lead {lead.name or lead.phone or lead.id} was assigned to you.",
    )
    await publish_event(
        "lead.assigned",
        {
            **_lead_event_payload(lead),
            "actor_user_id": str(actor.id),
            "target_user_id": str(target.id),
        },
    )
    await excel_sync_service.generate_latest_excel()
    return lead


async def bulk_assign(
    db: AsyncSession,
    lead_ids: List[UUID],
    target_username: str,
    actor: User,
) -> int:
    if actor.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from app.repositories.user_repository import UserRepository

    urepo = UserRepository()
    target = await urepo.get_by_username(db, target_username.strip())
    if not target or not target.is_active or target.role != "sale":
        raise HTTPException(status_code=400, detail="Invalid sale user")

    n = 0
    for lid in lead_ids:
        lead = await repo.get_by_id(db, lid)
        if not lead:
            continue
        old = lead.assigned_to
        await repo.update_lead(
            db,
            lead,
            assigned_to=target.username,
            updated_at=datetime.now(timezone.utc),
            updated_by_user_id=actor.id,
        )
        await audit_repo.add(
            db,
            lead_id=lead.id,
            actor_user_id=actor.id,
            action="bulk_assign",
            note=f"{old} -> {target.username}",
        )
        await notif_repo.create(
            db,
            user_id=target.id,
            title="Lead assigned",
            body=f"Bulk: lead {lead.name or lead.phone or lead.id} assigned to you.",
        )
        await publish_event(
            "lead.assigned.bulk",
            {
                **_lead_event_payload(lead),
                "actor_user_id": str(actor.id),
                "target_user_id": str(target.id),
            },
        )
        n += 1
    if n:
        await excel_sync_service.generate_latest_excel()
    return n


async def update_lead_fields(
    db: AsyncSession,
    lead_id: UUID,
    body: LeadUpdateBody,
    actor: User,
) -> Lead:
    lead = await repo.get_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if actor.role == "sale" and (lead.assigned_to or "").strip() != actor.username:
        raise HTTPException(status_code=403, detail="Not allowed")

    old_status = lead.status
    if body.status is not None:
        if body.status not in VALID_LEAD_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        lead.status = body.status
    if body.notes is not None:
        lead.notes = body.notes

    now = datetime.now(timezone.utc)
    if body.mark_contacted:
        lead.last_contact_at = now
        lead.contacted_at = now
        if lead.status in ("new", "contacting", "late"):
            lead.status = LEAD_STATUS_ACTIVE
    elif body.last_contact_at is not None:
        lead.last_contact_at = body.last_contact_at

    lead.updated_at = now
    lead.updated_by_user_id = actor.id
    await db.flush()
    from app.services.sla_service import event_based_sla_check

    await event_based_sla_check(db, lead)

    await audit_repo.add(
        db,
        lead_id=lead.id,
        actor_user_id=actor.id,
        action="update",
        old_status=old_status,
        new_status=lead.status,
        note=body.notes,
    )

    await db.refresh(lead)
    await publish_event(
        "lead.updated",
        {
            **_lead_event_payload(lead),
            "actor_user_id": str(actor.id),
            "old_status": old_status,
        },
    )
    await excel_sync_service.generate_latest_excel()
    return lead


async def export_leads_csv_rows(
    db: AsyncSession,
    current_user: User,
) -> List[List[str]]:
    leads = await list_leads(
        db,
        current_user=current_user,
        limit=10000,
        offset=0,
    )
    header = [
        "id",
        "created_at",
        "name",
        "phone",
        "phone_normalized",
        "assigned_to",
        "status",
        "last_contact_at",
        "source",
        "branch",
    ]
    rows: List[List[str]] = [header]
    for L in leads:
        rows.append(
            [
                str(L.id),
                L.created_at.isoformat() if L.created_at else "",
                L.name or "",
                L.phone or "",
                L.phone_normalized or "",
                L.assigned_to or "",
                L.status,
                L.last_contact_at.isoformat() if L.last_contact_at else "",
                L.source or "",
                L.branch or "",
            ]
        )
    return rows
