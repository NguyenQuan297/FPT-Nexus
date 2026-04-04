from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import List, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_miss_stat import DailyMissStat


class DailyMissRepository:
    async def upsert(
        self,
        db: AsyncSession,
        stat_date: date,
        user_id: UUID,
        miss_count: int,
    ) -> DailyMissStat:
        q = select(DailyMissStat).where(
            DailyMissStat.stat_date == stat_date,
            DailyMissStat.user_id == user_id,
        )
        row = (await db.execute(q)).scalar_one_or_none()
        if row:
            row.miss_count = miss_count
            await db.flush()
            await db.refresh(row)
            return row
        row = DailyMissStat(
            id=uuid.uuid4(),
            stat_date=stat_date,
            user_id=user_id,
            miss_count=miss_count,
            created_at=datetime.now(timezone.utc),
        )
        db.add(row)
        await db.flush()
        await db.refresh(row)
        return row

    async def sum_for_month_by_user(
        self, db: AsyncSession, year: int, month: int
    ) -> List[Tuple[UUID, int]]:
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)

        stmt = (
            select(DailyMissStat.user_id, func.coalesce(func.sum(DailyMissStat.miss_count), 0))
            .where(
                DailyMissStat.stat_date >= start,
                DailyMissStat.stat_date < end,
            )
            .group_by(DailyMissStat.user_id)
        )
        rows = (await db.execute(stmt)).all()
        return [(r[0], int(r[1])) for r in rows]

    async def sum_total_month(self, db: AsyncSession, year: int, month: int) -> int:
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)

        stmt = select(func.coalesce(func.sum(DailyMissStat.miss_count), 0)).where(
            DailyMissStat.stat_date >= start,
            DailyMissStat.stat_date < end,
        )
        return int((await db.execute(stmt)).scalar_one() or 0)

    async def sum_for_date(self, db: AsyncSession, stat_date: date) -> int:
        """Total misses recorded for one calendar day (all users), from daily snapshots."""
        stmt = select(func.coalesce(func.sum(DailyMissStat.miss_count), 0)).where(
            DailyMissStat.stat_date == stat_date,
        )
        return int((await db.execute(stmt)).scalar_one() or 0)
