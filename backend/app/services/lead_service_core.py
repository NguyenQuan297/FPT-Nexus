"""Lead core: ingest, query, single assign/update, list export. Bulk ops: lead_service_bulk."""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.call_status import (
    filter_leads_by_contact_call_status_labels,
    internal_status_from_call_label,
    set_extra_call_status_labels,
)
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
from app.services.lead_display_utils import assignee_matches_query, build_username_display_map
from app.schemas.lead import (
    DashboardStats,
    LeadQueryResponse,
    LeadUpdateBody,
)
from app.services.lead_query_service import query_leads_page as _query_leads_page

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


def _scope_for_user(
    user: User,
    assigned_to: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    if user.role == "admin":
        return assigned_to, None
    return None, user.username


def _ensure_extra_dict(lead: Lead) -> Dict[str, Any]:
    if not lead.extra:
        lead.extra = {}
    return dict(lead.extra)


def _is_bad_phone(phone: Optional[str]) -> bool:
    p = "".join(ch for ch in str(phone or "") if ch.isdigit())
    return len(p) < 10 or len(p) > 11


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


async def delete_lead(
    db: AsyncSession, lead_id: UUID, current_user: User
) -> bool:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete leads")
    deleted = await repo.delete(db, lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lead not found")
    return True


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
    contact_call_statuses: Optional[List[str]] = None,
    call_status_groups: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    enrollment_bucket: Optional[str] = None,
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
        contact_call_statuses=contact_call_statuses,
        call_status_groups=call_status_groups,
        date_from=date_from,
        date_to=date_to,
        enrollment_bucket=enrollment_bucket,
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
    contact_call_statuses: Optional[List[str]] = None,
    call_status_groups: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> List[UUID]:
    assignee_query = (assigned_to or "").strip()
    if current_user.role == "admin":
        af, sale_exact = None, None
    else:
        af, sale_exact = None, current_user.username
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
    if assignee_query:
        usernames = {(r.assigned_to or "").strip() for r in rows if (r.assigned_to or "").strip()}
        display_map = await build_username_display_map(db, usernames)
        rows = [r for r in rows if assignee_matches_query(r, assignee_query, display_map)]
    if statuses:
        allowed = {s.strip() for s in statuses if s and s.strip()}
        rows = [r for r in rows if r.status in allowed]
    rows = filter_leads_by_contact_call_status_labels(rows, contact_call_statuses)
    if call_status_groups:
        from app.core.call_status import lead_extra_call_status_label, norm_call_label as _ncl
        _NO_CONTACT = {"", _ncl("Chưa gọi"), _ncl("Chưa liên hệ")}
        _CONTACTING = {_ncl(x) for x in ("Chưa nghe máy lần 1", "Chưa nghe máy lần 2", "Chưa nghe máy lần 3", "Gọi lại sau", "Thuê bao", "Máy bận", "Đã gọi - Không nghe máy", "Đã gọi - Thuê bao", "Đã gọi - Bận", "Đã gọi - Hẹn gọi lại", "Đã gọi - Nhầm máy")}
        _CONTACTED = {_ncl(x) for x in ("Đã nghe máy", "Đã gọi - Quan tâm", "Đã gọi - Tiềm năng", "Đã gọi - Suy nghĩ thêm", "Đã gọi - Không quan tâm", "Đã gọi - Đã chốt", "Đã gọi - Đã gửi mail", "Đã gọi - Đã gửi zalo", "Đã gọi - Đã gửi báo giá", "Đã gọi - Đã gửi hợp đồng", "Đã gọi - Đã thanh toán", "Đã gọi - Đã hoàn thành")}
        groups = {g.strip() for g in call_status_groups if g.strip()}
        filtered = []
        for r in rows:
            ex = getattr(r, "extra", None)
            lbl = _ncl(lead_extra_call_status_label(ex if isinstance(ex, dict) else None))
            if "chua_lien_he" in groups and (lbl in _NO_CONTACT or r.status == "new"):
                filtered.append(r); continue
            if "dang_lien_he" in groups and lbl in _CONTACTING:
                filtered.append(r); continue
            if "da_lien_he" in groups and lbl in _CONTACTED:
                filtered.append(r); continue
            if "khac" in groups and lbl not in _NO_CONTACT and lbl not in _CONTACTING and lbl not in _CONTACTED:
                filtered.append(r); continue
        rows = filtered
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
    await excel_sync_service.generate_latest_excel(force=True)
    return lead


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
    explicit_status = body.status is not None
    if body.status is not None:
        if body.status not in VALID_LEAD_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        lead.status = body.status
    if body.notes is not None:
        lead.notes = body.notes

    appended_exchange = False
    if body.append_note and str(body.append_note).strip():
        now = datetime.now(timezone.utc)
        time_part = now.strftime("%H:%M")
        date_part = now.strftime("%d/%m/%Y")
        actor_label = (getattr(actor, "display_name", None) or "").strip() or actor.username
        body_line = str(body.append_note).strip().replace("\n", " ")
        line = f"{actor_label} {time_part} {date_part}: {body_line}"
        lead.notes = f"{lead.notes}\n\n{line}" if (lead.notes or "").strip() else line
        ex = _ensure_extra_dict(lead)
        ex["Trao đổi gần nhất"] = (lead.notes or "")[:32000]
        lead.extra = ex
        appended_exchange = True

    now = datetime.now(timezone.utc)
    if body.mark_contacted:
        lead.last_contact_at = now
        lead.contacted_at = now
        if lead.status in ("new", "contacting", "late"):
            lead.status = LEAD_STATUS_ACTIVE
        ex = _ensure_extra_dict(lead)
        if not appended_exchange:
            ex["Trao đổi gần nhất"] = now.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M")
        ex["Tình trạng gọi điện"] = "Đã gọi - Quan tâm"
        ex["Tình trạng cuộc gọi"] = "Đã gọi - Quan tâm"
        lead.extra = ex
    elif body.last_contact_at is not None:
        lead.last_contact_at = body.last_contact_at

    if body.contact_call_status is not None:
        ex = _ensure_extra_dict(lead)
        lead.extra = set_extra_call_status_labels(ex, body.contact_call_status)
        if not explicit_status:
            inferred = internal_status_from_call_label((body.contact_call_status or "").strip())
            if inferred is not None:
                lead.status = inferred
        # Auto-update interest level from call status
        _ccs = (body.contact_call_status or "").strip().lower()
        _interest_map = {
            "quan tâm": "Quan tâm",
            "không quan tâm": "Không quan tâm",
            "tiềm năng": "Tiềm năng",
            "đã chốt": "Đã chốt",
            "suy nghĩ thêm": "Suy nghĩ thêm",
        }
        for keyword, level in _interest_map.items():
            if keyword in _ccs:
                ex["Mức độ quan tâm"] = level
                lead.extra = ex
                break

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
    if notification_copy.sale_lead_update_should_notify(body):
        detail = notification_copy.telegram_text_update_lead(
            actor.username,
            getattr(actor, "display_name", None),
            lead,
            old_status,
            body,
        )
        if actor.role == "sale":
            await notify_service.notify_admins_in_app_async(
                db,
                title="Sale cập nhật lead",
                body=detail,
            )
        await notify_service.notify_admin_action_async(
            text=detail,
            actor_user_id=None,
        )
    await excel_sync_service.generate_latest_excel(force=True)
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
