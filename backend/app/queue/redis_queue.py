from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

import redis.asyncio as redis

from app.core.config import settings

log = logging.getLogger(__name__)

_redis: Optional[redis.Redis] = None


async def _client() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _json_default(obj: Any) -> str:
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def deserialize_lead_row(raw: str) -> Dict[str, Any]:
    data = json.loads(raw)
    row = data["row"]
    for k in ("created_at", "last_contact_at", "contacted_at", "updated_at", "last_alert_sent_at"):
        if isinstance(row.get(k), str):
            row[k] = datetime.fromisoformat(row[k].replace("Z", "+00:00"))
    if row.get("upload_batch_id"):
        row["upload_batch_id"] = UUID(str(row["upload_batch_id"]))
    return data


async def publish_to_dlq(payload: Dict[str, Any]) -> None:
    try:
        r = await _client()
        await r.lpush(
            settings.lead_ingest_dlq_key,
            json.dumps(payload, default=_json_default),
        )
    except Exception as e:
        log.warning("DLQ push failed: %s", e)


async def publish_lead_row(batch_id: str, row: Dict[str, Any]) -> None:
    try:
        r = await _client()
        payload = json.dumps({"batch_id": batch_id, "row": row}, default=_json_default)
        await r.lpush(settings.lead_ingest_queue_key, payload)
        log.debug("Queued lead row for batch %s", batch_id)
    except Exception as e:
        log.exception("Cannot queue row: Redis unavailable? %s", e)
        raise


async def blocking_pop_lead_row(timeout_seconds: int = 5) -> Optional[Dict[str, Any]]:
    """BRPOP: FIFO with LPUSH producer."""
    try:
        r = await _client()
        result = await r.brpop(settings.lead_ingest_queue_key, timeout=timeout_seconds)
        if not result:
            return None
        _, payload = result
        return deserialize_lead_row(payload)
    except Exception as e:
        log.warning("Redis queue unavailable: %s", e)
        return None
