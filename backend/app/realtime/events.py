from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

import redis.asyncio as redis

from app.core.config import settings

log = logging.getLogger(__name__)

CHANNEL = "lead_ops:events"
_redis_client: redis.Redis | None = None


def _json_default(obj: Any) -> str:
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    return str(obj)


async def _client() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


async def publish_event(event_type: str, payload: Dict[str, Any]) -> None:
    event = {
        "type": event_type,
        "ts": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    try:
        r = await _client()
        await r.publish(CHANNEL, json.dumps(event, default=_json_default))
    except Exception as e:
        # Realtime should never block core workflows.
        log.debug("publish_event skipped: %s", e)

