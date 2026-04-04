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
        late=late,
        daily_misses_today=daily_misses_today,
    )
