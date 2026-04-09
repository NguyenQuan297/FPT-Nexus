from __future__ import annotations

import logging
from pathlib import Path

import redis.asyncio as redis
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.daily_miss_stat import DailyMissStat
from app.models.import_batch import ImportBatch
from app.models.ingest_error import IngestError
from app.models.lead import Lead
from app.models.lead_status_audit import LeadStatusAudit
from app.models.notification import Notification
from app.services import cache_service

log = logging.getLogger(__name__)


async def reset_operational_data(db: AsyncSession) -> dict:
    """
    Wipe runtime data so a fresh upload starts from a clean state.
    Users/auth tables are preserved.
    """
    # Order matters due to FKs.
    await db.execute(delete(LeadStatusAudit))
    await db.execute(delete(IngestError))
    await db.execute(delete(Lead))
    await db.execute(delete(ImportBatch))
    await db.execute(delete(DailyMissStat))
    await db.execute(delete(Notification))
    await db.commit()

    await cache_service.cache_delete("dash:")
    await _clear_redis_runtime_keys()
    _clear_synced_excel_files()
    return {"ok": True, "message": "Operational lead data reset complete"}


async def _clear_redis_runtime_keys() -> None:
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True)
        await r.delete(settings.lead_ingest_queue_key)
        await r.delete(settings.lead_ingest_dlq_key)
        async for k in r.scan_iter(match="dash:*"):
            await r.delete(k)
        await r.close()
    except Exception as e:
        log.debug("redis runtime key reset skipped: %s", e)


def _clear_synced_excel_files() -> None:
    try:
        p = Path(settings.upload_dir) / "synced"
        if not p.exists():
            return
        for f in p.glob("*"):
            if f.is_file():
                f.unlink(missing_ok=True)
    except Exception as e:
        log.debug("sync file cleanup skipped: %s", e)

