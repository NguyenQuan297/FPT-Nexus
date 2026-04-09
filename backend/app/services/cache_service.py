from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Union

import redis.asyncio as redis

from app.core.config import settings

log = logging.getLogger(__name__)

_redis: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get_json(key: str) -> Optional[Union[Dict[str, Any], List[Any]]]:
    try:
        r = await get_redis()
        raw = await r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        log.debug("cache_get_json skip: %s", e)
        return None


async def cache_set_json(
    key: str, value: Union[Dict[str, Any], List[Any]], ttl_seconds: int = 60
) -> None:
    try:
        r = await get_redis()
        await r.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception as e:
        log.debug("cache_set_json skip: %s", e)


async def cache_delete(prefix: str) -> None:
    try:
        r = await get_redis()
        async for k in r.scan_iter(match=f"{prefix}*"):
            await r.delete(k)
    except Exception as e:
        log.debug("cache_delete skip: %s", e)


def cache_delete_sync(prefix: str) -> None:
    import redis as sync_redis

    try:
        r = sync_redis.from_url(settings.redis_url, decode_responses=True)
        for k in r.scan_iter(match=f"{prefix}*"):
            r.delete(k)
    except Exception as e:
        log.debug("cache_delete_sync skip: %s", e)
