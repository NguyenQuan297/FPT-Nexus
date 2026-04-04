from __future__ import annotations

import logging
from datetime import date, datetime, time, timezone
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import LEAD_STATUS_CLOSED
from app.models.lead import Lead
from app.models.user import User
from app.repositories.daily_miss_repository import DailyMissRepository
from app.repositories.user_repository import UserRepository
from app.services.sla_service import sla_deadline

log = logging.getLogger(__name__)

daily_repo = DailyMissRepository()
user_repo = UserRepository()


async def snapshot_daily_misses_for_date(db: AsyncSession, stat_date: date) -> int:
    """
    For each sale user, count leads assigned to them with no contact where
    SLA was already violated by end of stat_date (UTC).
    """
    end_of_day = datetime.combine(stat_date, time(23, 59, 59), tzinfo=timezone.utc)
    sales = [u for u in await user_repo.list_users(db) if u.role == "sale"]
    rows_written = 0
    for u in sales:
        q = select(Lead).where(
            Lead.assigned_to == u.username,
            Lead.last_contact_at.is_(None),
            Lead.status != LEAD_STATUS_CLOSED,
        )
        leads: List[Lead] = list((await db.execute(q)).scalars().all())
        n = 0
        for lead in leads:
            c = lead.created_at
            if c.tzinfo is None:
                c = c.replace(tzinfo=timezone.utc)
            dl = sla_deadline(c, lead.sla_hours_at_ingest or settings.sla_hours)
            if dl <= end_of_day:
                n += 1
        await daily_repo.upsert(db, stat_date, u.id, n)
        rows_written += 1
    await db.commit()
    log.info("Daily miss snapshot %s: %s sale rows", stat_date, rows_written)
    return rows_written
