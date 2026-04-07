"""
Nghiệp vụ lead dạng hàng loạt: gán nhiều lead, bulk action (trạng thái, nhãn Excel…), export CSV theo lọc.

Phụ thuộc `lead_service_core` (repo, scope, helper extra/phone).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.call_status import filter_leads_by_contact_call_status_labels
from app.core.constants import LEAD_STATUS_ACTIVE
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import BulkActionBody, BulkActionOut, LeadFilterBody
from app.realtime.events import publish_event
from app.services import excel_sync_service, notification_copy, notify_service
from app.services.lead_service_core import (
    _ensure_extra_dict,
    _is_bad_phone,
    _lead_event_payload,
    _scope_for_user,
    audit_repo,
    notif_repo,
    repo,
    user_repo,
)
from app.services.sla_service import is_lead_overdue

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
        await excel_sync_service.generate_latest_excel(force=True)
    return n


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
        rows = filter_leads_by_contact_call_status_labels(rows, f.contact_call_statuses)
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
            ex["Tình trạng gọi điện"] = "Đã gọi - Không nghe máy"
            ex["Tình trạng cuộc gọi"] = "Đã gọi - Không nghe máy"
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
            ex["Tình trạng gọi điện"] = "Đã gọi - Quan tâm"
            ex["Tình trạng cuộc gọi"] = "Đã gọi - Quan tâm"
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
            ex["Tình trạng gọi điện"] = "Đã gọi - Quan tâm"
            ex["Tình trạng cuộc gọi"] = "Đã gọi - Quan tâm"
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
        counter: dict[str, int] = {}
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
        await excel_sync_service.generate_latest_excel(force=True)

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
