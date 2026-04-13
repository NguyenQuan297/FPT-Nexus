from __future__ import annotations

import logging
from datetime import timedelta

from app.db.session import AsyncSessionLocal
from app.services.daily_miss_service import snapshot_daily_misses_for_date

log = logging.getLogger(__name__)


async def schedule_daily_miss_job() -> None:
    try:
        await _run()
    except Exception:
        log.exception("Daily miss job failed")


async def _run() -> None:
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).date()
    stat_date = today - timedelta(days=1)
    async with AsyncSessionLocal() as db:
        await snapshot_daily_misses_for_date(db, stat_date)
