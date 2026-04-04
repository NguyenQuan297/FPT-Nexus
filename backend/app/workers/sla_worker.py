from __future__ import annotations

import asyncio
import logging

from app.db.session import AsyncSessionLocal
from app.services import cache_service
from app.services import sla_service

log = logging.getLogger(__name__)


async def run_sla_job_async() -> int:
    async with AsyncSessionLocal() as db:
        n = await sla_service.run_sla_pass(db)
        await db.commit()
    if n:
        await cache_service.cache_delete("dash:")
    return n


def schedule_sla_job() -> None:
    """Entry point for APScheduler (sync)."""
    try:
        asyncio.run(run_sla_job_async())
    except Exception:
        log.exception("SLA worker job failed")
