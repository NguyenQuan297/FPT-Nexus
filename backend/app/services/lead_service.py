from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import LEAD_STATUS_ACTIVE, VALID_LEAD_STATUSES
from app.models.lead import Lead
from app.models.user import User
from app.pipelines.etl import normalize_lead_row
from app.repositories.lead_audit_repository import LeadAuditRepository
from app.repositories.lead_repository import LeadRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.user_repository import UserRepository
from app.realtime.events import publish_event
from app.services import excel_sync_service, notification_copy, notify_service
from app.schemas.lead import (
    BulkActionBody,
    BulkActionOut,
    DashboardStats,
    LeadFilterBody,
    LeadQueryResponse,
    LeadUpdateBody,
)
from app.services.lead_query_service import query_leads_page as _query_leads_page
from app.services.sla_service import is_lead_overdue

log = logging.getLogger(__name__)

repo = LeadRepository()
notif_repo = NotificationRepository()
audit_repo = LeadAuditRepository()
user_repo = UserRepository()


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


async def query_leads_page(
    db: AsyncSession,
    *,
    current_user: User,
    assigned_to: Optional[str] = None,
    phone_search: Optional[str] = None,
    overdue_only: bool = False,
    uncontacted_only: bool = False,
    statuses: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 20,
) -> LeadQueryResponse:
    return await _query_leads_page(
        db,
        repo=repo,
        current_user=current_user,
        assigned_to=assigned_to,
        phone_search=phone_search,
        overdue_only=overdue_only,
        uncontacted_only=uncontacted_only,
        statuses=statuses,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )


async def query_lead_ids(
    db: AsyncSession,
    *,
    current_user: User,
    assigned_to: Optional[str] = None,
    phone_search: Optional[str] = None,
    overdue_only: bool = False,
    uncontacted_only: bool = False,
    statuses: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> List[UUID]:
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
        allowed = {s.strip() for s in statuses if s and s.strip()}
        rows = [r for r in rows if r.status in allowed]
    if uncontacted_only:
        rows = [r for r in rows if r.last_contact_at is None and r.status != "closed"]
    if date_from:
        start_dt = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
        rows = [r for r in rows if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) >= start_dt]
    if date_to:
        end_dt = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
        rows = [r for r in rows if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) <= end_dt]
    return [r.id for r in rows]


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
    assignee = (target_username or "").strip()
    if not assignee:
        raise HTTPException(status_code=400, detail="Thiếu người phụ trách")
    target = await user_repo.get_by_username(db, assignee)

    old_assign = lead.assigned_to
    extra = dict(lead.extra or {})
    if target:
        display_label = (target.display_name or "").strip() or assignee
    else:
        display_label = assignee
    extra["assignee_display_label"] = display_label
    await repo.update_lead(
        db,
        lead,
        assigned_to=assignee,
        updated_at=datetime.now(timezone.utc),
        updated_by_user_id=actor.id,
        extra=extra,
    )
    await audit_repo.add(
        db,
        lead_id=lead.id,
        actor_user_id=actor.id,
        action="assign",
        note=f"assignee: {old_assign} -> {assignee}",
    )
    if target and target.is_active and target.role == "sale":
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
            "target_user_id": str(target.id) if target else None,
        },
    )
    await notify_service.notify_admin_action_async(
        text=notification_copy.telegram_text_assign_lead(actor.username, assignee, lead),
        actor_user_id=actor.id,
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
    assignee = (target_username or "").strip()
    if not assignee:
        raise HTTPException(status_code=400, detail="Thiếu người phụ trách")
    target = await user_repo.get_by_username(db, assignee)

    n = 0
    for lid in lead_ids:
        lead = await repo.get_by_id(db, lid)
        if not lead:
            continue
        old = lead.assigned_to
        extra = dict(lead.extra or {})
        if target:
            display_label = (target.display_name or "").strip() or assignee
        else:
            display_label = assignee
        extra["assignee_display_label"] = display_label
        await repo.update_lead(
            db,
            lead,
            assigned_to=assignee,
            updated_at=datetime.now(timezone.utc),
            updated_by_user_id=actor.id,
            extra=extra,
        )
        await audit_repo.add(
            db,
            lead_id=lead.id,
            actor_user_id=actor.id,
            action="bulk_assign",
            note=f"{old} -> {assignee}",
        )
        if target and target.is_active and target.role == "sale":
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
                "target_user_id": str(target.id) if target else None,
            },
        )
        n += 1
    if n:
        await notify_service.notify_admin_action_async(
            text=notification_copy.telegram_text_bulk_assign(actor.username, n, assignee),
            actor_user_id=actor.id,
        )
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
    if body.append_note and str(body.append_note).strip():
        ts = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
        actor_label = (getattr(actor, "display_name", None) or "").strip() or actor.username
        line = f"[{ts}] {actor_label}: {str(body.append_note).strip()}"
        lead.notes = f"{lead.notes}\n\n{line}" if (lead.notes or "").strip() else line

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
    if actor.role == "sale":
        await notify_service.notify_admin_action_async(
            text=notification_copy.telegram_text_update_lead(
                actor.username,
                getattr(actor, "display_name", None),
                lead,
                old_status,
                body,
            ),
            actor_user_id=None,
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


async def list_available_assignees(
    db: AsyncSession,
    *,
    actor: User,
) -> List[str]:
    if actor.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ admin được xem danh sách người phụ trách.")
    return await repo.list_distinct_assignees(db)


async def _resolve_bulk_target_leads(
    db: AsyncSession,
    *,
    actor: User,
    lead_ids: List[UUID],
    apply_filtered: bool,
    filters: Optional[LeadFilterBody],
    only_overdue: bool,
) -> List[Lead]:
    if apply_filtered:
        f = filters or LeadFilterBody()
        af, sale_exact = _scope_for_user(actor, f.assigned_to)
        rows = await repo.list_leads(
            db,
            assigned_to=af,
            status=None,
            phone_search=f.phone,
            overdue_only=f.overdue_only,
            sale_username_exact=sale_exact,
            limit=100000,
            offset=0,
        )
        if f.statuses:
            allowed = {x.strip() for x in f.statuses if x and x.strip()}
            rows = [r for r in rows if r.status in allowed]
        if f.uncontacted_only:
            rows = [r for r in rows if r.last_contact_at is None]
        if f.date_from:
            df = f.date_from if f.date_from.tzinfo else f.date_from.replace(tzinfo=timezone.utc)
            rows = [r for r in rows if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) >= df]
        if f.date_to:
            dt = f.date_to if f.date_to.tzinfo else f.date_to.replace(tzinfo=timezone.utc)
            rows = [r for r in rows if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) <= dt]
    else:
        if not lead_ids:
            return []
        rows = await repo.list_ids_by_ids_for_user(
            db,
            lead_ids=lead_ids,
            sale_username=actor.username if actor.role == "sale" else None,
        )
    if only_overdue:
        now = datetime.now(timezone.utc)
        rows = [
            r
            for r in rows
            if is_lead_overdue(
                created_at=r.created_at,
                last_contact_at=r.last_contact_at,
                status=r.status,
                sla_hours=r.sla_hours_at_ingest,
                now=now,
            )
        ]
    return rows


def _ensure_extra_dict(lead: Lead) -> Dict[str, Any]:
    if not lead.extra:
        lead.extra = {}
    return dict(lead.extra)


def _is_bad_phone(phone: Optional[str]) -> bool:
    p = "".join(ch for ch in str(phone or "") if ch.isdigit())
    return len(p) < 10 or len(p) > 11


async def bulk_apply_action(
    db: AsyncSession,
    *,
    actor: User,
    body: BulkActionBody,
) -> BulkActionOut:
    rows = await _resolve_bulk_target_leads(
        db,
        actor=actor,
        lead_ids=body.lead_ids,
        apply_filtered=body.apply_filtered,
        filters=body.filters,
        only_overdue=body.only_overdue,
    )
    total = len(rows)
    if total == 0:
        return BulkActionOut(total_selected=0, affected=0, skipped=0, message="Không có lead phù hợp để xử lý.")

    now = datetime.now(timezone.utc)
    affected = 0
    skipped = 0
    action = (body.action or "").strip().lower()

    if action == "assign_to_user":
        if actor.role != "admin":
            raise HTTPException(status_code=403, detail="Chỉ admin mới được gán hàng loạt.")
        assignee = (body.username or "").strip()
        if not assignee:
            raise HTTPException(status_code=400, detail="Thiếu username để gán.")
        for lead in rows:
            lead.assigned_to = assignee
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action in ("auto_assign_round_robin", "auto_assign_least_workload"):
        if actor.role != "admin":
            raise HTTPException(status_code=403, detail="Chỉ admin mới được auto assign.")
        users = [u for u in await user_repo.list_users(db) if u.role == "sale" and u.is_active]
        if not users:
            raise HTTPException(status_code=400, detail="Không có sale active để auto assign.")
        users.sort(key=lambda x: x.username.lower())
        if action == "auto_assign_least_workload":
            counts = {
                u.username: (
                    await db.execute(select(func.count()).select_from(Lead).where(Lead.assigned_to == u.username))
                ).scalar_one()
                for u in users
            }
            users.sort(key=lambda u: (counts.get(u.username, 0), u.username.lower()))
        idx = 0
        for lead in rows:
            target = users[idx % len(users)]
            lead.assigned_to = target.username
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            idx += 1
            affected += 1

    elif action == "status_new_to_contacting":
        for lead in rows:
            if lead.status != "new":
                skipped += 1
                continue
            lead.status = "contacting"
            ex = _ensure_extra_dict(lead)
            ex["Tình trạng gọi điện"] = "Đang liên hệ"
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "status_contacting_to_da_nghe_may":
        for lead in rows:
            if lead.status != "contacting":
                skipped += 1
                continue
            lead.status = "active"
            ex = _ensure_extra_dict(lead)
            ex["Tình trạng gọi điện"] = "Đã nghe máy"
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "mark_contacted":
        for lead in rows:
            lead.last_contact_at = now
            lead.contacted_at = now
            if lead.status in ("new", "contacting", "late"):
                lead.status = LEAD_STATUS_ACTIVE
            ex = _ensure_extra_dict(lead)
            ex["Trao đổi gần nhất"] = now.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M")
            ex["Tình trạng gọi điện"] = "Đã liên hệ"
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "update_interest":
        allowed = {"Quan tâm", "Suy nghĩ thêm", "Không quan tâm"}
        if not body.interest_level or body.interest_level not in allowed:
            raise HTTPException(status_code=400, detail="Mức độ quan tâm không hợp lệ.")
        for lead in rows:
            ex = _ensure_extra_dict(lead)
            ex["Mức độ quan tâm"] = body.interest_level
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "mark_can_delete":
        for lead in rows:
            ex = _ensure_extra_dict(lead)
            ex["Check lead cần xóa"] = "true"
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "detect_duplicates":
        dup_phones = set()
        counter: Dict[str, int] = {}
        for lead in rows:
            p = (lead.phone_normalized or lead.phone or "").strip()
            if not p:
                continue
            counter[p] = counter.get(p, 0) + 1
        dup_phones = {k for k, v in counter.items() if v > 1}
        for lead in rows:
            p = (lead.phone_normalized or lead.phone or "").strip()
            ex = _ensure_extra_dict(lead)
            ex["Trùng lead"] = "Có" if p and p in dup_phones else "Không"
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "detect_bad_phone":
        for lead in rows:
            ex = _ensure_extra_dict(lead)
            ex["Sai số"] = "Có" if _is_bad_phone(lead.phone) else "Không"
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1

    elif action == "set_follow_up":
        if not body.follow_up_at:
            raise HTTPException(status_code=400, detail="Thiếu ngày chăm sóc lại.")
        follow_up = body.follow_up_at if body.follow_up_at.tzinfo else body.follow_up_at.replace(tzinfo=timezone.utc)
        for lead in rows:
            ex = _ensure_extra_dict(lead)
            ex["Chăm sóc lại"] = follow_up.strftime("%d/%m/%Y %H:%M")
            lead.extra = ex
            lead.updated_at = now
            lead.updated_by_user_id = actor.id
            affected += 1
    else:
        raise HTTPException(status_code=400, detail="Bulk action không hợp lệ.")

    await db.flush()
    if affected:
        await notify_service.notify_admin_action_async(
            text=notification_copy.telegram_text_bulk_action(
                actor.username, action, affected, total, skipped
            ),
            actor_user_id=actor.id,
        )
        await excel_sync_service.generate_latest_excel()

    return BulkActionOut(
        total_selected=total,
        affected=affected,
        skipped=skipped,
        message=f"Đã xử lý {affected}/{total} lead.",
    )


async def bulk_export_csv_rows(
    db: AsyncSession,
    *,
    actor: User,
    body: BulkActionBody,
) -> List[List[str]]:
    rows = await _resolve_bulk_target_leads(
        db,
        actor=actor,
        lead_ids=body.lead_ids,
        apply_filtered=body.apply_filtered,
        filters=body.filters,
        only_overdue=body.only_overdue,
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
    out: List[List[str]] = [header]
    for L in rows:
        out.append(
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
    return out
