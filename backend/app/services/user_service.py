from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.repositories.lead_repository import LeadRepository
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user_admin import UserCreate, UserPerformanceOut, UserUpdate
from app.services import cache_service, presence_service
from app.services.sla_service import is_lead_overdue

repo = UserRepository()
lead_repo = LeadRepository()


def _norm_assignee(v: object) -> str:
    return " ".join(str(v or "").strip().split()).lower()


async def _auto_merge_existing_leads_for_sale(
    db: AsyncSession,
    *,
    username: str,
    display_name: Optional[str],
) -> int:
    """
    Auto-adopt old Excel assignee labels for new/updated sale account.
    Match by normalized text (case + whitespace insensitive), then reassign exact labels.
    """
    dn = (display_name or "").strip()
    if not dn:
        return 0
    target = _norm_assignee(dn)
    if not target:
        return 0
    labels = await lead_repo.list_distinct_assignees(db)
    merged = 0
    for label in labels:
        old = str(label or "").strip()
        if not old:
            continue
        if _norm_assignee(old) != target:
            continue
        if old == username.strip():
            continue
        merged += await lead_repo.reassign_leads_from_label_to_username(
            db, old_label=old, new_username=username
        )
    if merged:
        await cache_service.cache_delete("dash:")
    return merged


async def create_user(db: AsyncSession, body: UserCreate) -> User:
    existing = await repo.get_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    if body.role not in ("admin", "sale"):
        raise HTTPException(status_code=400, detail="Invalid role")
    pw = hash_password(body.password)
    dn = (body.display_name or "").strip() or None
    user = await repo.create(db, body.username, pw, body.role, display_name=dn)
    if user.role == "sale":
        await _auto_merge_existing_leads_for_sale(
            db,
            username=user.username,
            display_name=user.display_name,
        )
    return user


async def update_user(db: AsyncSession, user_id: UUID, body: UserUpdate) -> tuple[User, int]:
    user = await repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = body.model_dump(exclude_unset=True)
    if "role" in data and data["role"] is not None:
        if data["role"] not in ("admin", "sale"):
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = data["role"]
    if "is_active" in data and data["is_active"] is not None:
        user.is_active = data["is_active"]
    if body.password:
        user.password_hash = hash_password(body.password)
    if "display_name" in data:
        user.display_name = (data.get("display_name") or "").strip() or None
    merged = 0
    if "merge_leads_from_assignee" in data and data.get("merge_leads_from_assignee"):
        old = str(data["merge_leads_from_assignee"]).strip()
        if old and old != user.username.strip():
            merged = await lead_repo.reassign_leads_from_label_to_username(
                db, old_label=old, new_username=user.username
            )
            if merged:
                await cache_service.cache_delete("dash:")
    elif "display_name" in data and user.role == "sale":
        merged = await _auto_merge_existing_leads_for_sale(
            db,
            username=user.username,
            display_name=user.display_name,
        )
    return (await repo.save(db, user), merged)


async def list_users(db: AsyncSession) -> List[User]:
    return await repo.list_users(db)


async def get_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
    return await repo.get_by_id(db, user_id)


def _normalize_enrollment_bucket(raw: object) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if not text:
        return None
    if "reg" in text or "đăng ký" in text or "ghi danh" in text:
        return "REG"
    return None


async def list_user_performance(db: AsyncSession) -> List[UserPerformanceOut]:
    users = await repo.list_users(db)
    online_map = await presence_service.get_online_map([u.id for u in users])
    now = datetime.now(timezone.utc)
    out: List[UserPerformanceOut] = []
    for u in users:
        leads = await lead_repo.list_leads(
            db,
            assigned_to=None,
            status=None,
            phone_search=None,
            overdue_only=False,
            sale_username_exact=u.username,
            limit=100000,
            offset=0,
        )
        total = len(leads)
        overdue = sum(
            1
            for L in leads
            if is_lead_overdue(
                created_at=L.created_at,
                last_contact_at=L.last_contact_at,
                status=L.status,
                sla_hours=L.sla_hours_at_ingest,
                now=now,
            )
        )
        reg_count = sum(1 for L in leads if _normalize_enrollment_bucket((L.extra or {}).get("Tình trạng nhập học")) == "REG")
        sla_pct = round(((total - overdue) / total) * 100.0, 2) if total else 100.0
        reg_pct = round((reg_count / total) * 100.0, 2) if total else 0.0
        out.append(
            UserPerformanceOut(
                id=u.id,
                username=u.username,
                display_name=u.display_name,
                role=u.role,
                is_active=u.is_active,
                is_online=online_map.get(str(u.id), False),
                leads=total,
                sla_pct=sla_pct,
                reg_pct=reg_pct,
            )
        )
    return out
