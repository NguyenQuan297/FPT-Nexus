from __future__ import annotations

from typing import Dict, Iterable
from uuid import UUID

from app.services.cache_service import get_redis

_KEY_USER_ONLINE = "presence:user:"
_KEY_WS_CONN_COUNT = "presence:ws_conn:"
_ONLINE_TTL_SECONDS = 120


def _uid(v: UUID | str) -> str:
    return str(v)


async def touch_online(user_id: UUID | str, *, ttl_seconds: int = _ONLINE_TTL_SECONDS) -> None:
    try:
        r = await get_redis()
        await r.set(f"{_KEY_USER_ONLINE}{_uid(user_id)}", "1", ex=ttl_seconds)
    except Exception:
        return


async def set_offline(user_id: UUID | str) -> None:
    try:
        r = await get_redis()
        await r.delete(f"{_KEY_USER_ONLINE}{_uid(user_id)}")
    except Exception:
        return


async def ws_connect(user_id: UUID | str) -> None:
    try:
        r = await get_redis()
        uid = _uid(user_id)
        await r.incr(f"{_KEY_WS_CONN_COUNT}{uid}")
        await touch_online(uid)
    except Exception:
        return


async def ws_disconnect(user_id: UUID | str) -> None:
    try:
        r = await get_redis()
        uid = _uid(user_id)
        k = f"{_KEY_WS_CONN_COUNT}{uid}"
        n = await r.decr(k)
        if n <= 0:
            await r.delete(k)
            await set_offline(uid)
    except Exception:
        return


async def get_online_map(user_ids: Iterable[UUID | str]) -> Dict[str, bool]:
    ids = [_uid(x) for x in user_ids]
    if not ids:
        return {}
    try:
        r = await get_redis()
        keys = [f"{_KEY_USER_ONLINE}{uid}" for uid in ids]
        vals = await r.mget(keys)
        return {uid: bool(v) for uid, v in zip(ids, vals)}
    except Exception:
        return {uid: False for uid in ids}
