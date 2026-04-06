from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    LEAD_STATUS_ACTIVE,
    LEAD_STATUS_CONTACTING,
    LEAD_STATUS_LATE,
)
from app.repositories.daily_miss_repository import DailyMissRepository
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import DashboardStats

log = logging.getLogger(__name__)
_daily_miss_repo = DailyMissRepository()


def _normalize_enrollment_bucket(raw: object) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if not text:
        return None
    if "reg" in text or "đăng ký" in text or "ghi danh" in text:
        return "REG"
    if "nb" in text or "booking" in text or "giữ chỗ" in text:
        return "NB"
    if text == "ne" or "nhập học" in text:
        return "NE"
    return None


async def build_dashboard_stats(
    db: AsyncSession,
    repo: LeadRepository,
    assigned_to: Optional[str],
    sale_username: Optional[str],
    *,
    include_daily_miss_snapshot: bool = False,
) -> DashboardStats:
    total = await repo.count_total(
        db, assigned_to=assigned_to, sale_username=sale_username
    )
    uncontacted = await repo.count_uncontacted(
        db, assigned_to=assigned_to, sale_username=sale_username
    )
    active_leads = await repo.count_by_status(
        db,
        LEAD_STATUS_ACTIVE,
        assigned_to=assigned_to,
        sale_username=sale_username,
    )
    contacting = await repo.count_by_status(
        db,
        LEAD_STATUS_CONTACTING,
        assigned_to=assigned_to,
        sale_username=sale_username,
    )
    overdue = await repo.count_overdue_uncontacted(
        db, assigned_to=assigned_to, sale_username=sale_username
    )
    all_rows = await repo.list_leads(
        db,
        assigned_to=assigned_to,
        status=None,
        phone_search=None,
        overdue_only=False,
        sale_username_exact=sale_username,
        limit=100000,
        offset=0,
    )
    now = datetime.now(timezone.utc)
    at_risk = 0
    reg_count = 0
    for r in all_rows:
        if _normalize_enrollment_bucket((r.extra or {}).get("Tình trạng nhập học")) == "REG":
            reg_count += 1
        if r.status == "closed" or r.last_contact_at is not None:
            continue
        created = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
        age_h = (now - created).total_seconds() / 3600
        if 12 <= age_h < 16:
            at_risk += 1
    conversion_reg_pct = round((reg_count / total) * 100.0, 2) if total else 0.0
    late = await repo.count_by_status(
        db,
        LEAD_STATUS_LATE,
        assigned_to=assigned_to,
        sale_username=sale_username,
    )
    daily_misses_today = None
    if include_daily_miss_snapshot:
        today = datetime.now(timezone.utc).date()
        try:
            daily_misses_today = await _daily_miss_repo.sum_for_date(db, today)
        except Exception as e:
            log.warning("daily_miss_stats query failed (table missing?): %s", e)
            daily_misses_today = None
    return DashboardStats(
        total_leads=total,
        uncontacted=uncontacted,
        active_leads=active_leads,
        contacting=contacting,
        overdue=overdue,
        at_risk=at_risk,
        late=late,
        conversion_reg_pct=conversion_reg_pct,
        daily_misses_today=daily_misses_today,
    )
