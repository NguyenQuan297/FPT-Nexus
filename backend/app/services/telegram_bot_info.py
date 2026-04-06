"""Lấy username bot từ Telegram getMe (không bắt buộc TELEGRAM_BOT_USERNAME trong .env)."""

from __future__ import annotations

import logging
from typing import Optional, Tuple

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

# Tránh gọi getMe lặp lại mỗi request (token đổi hiếm)
_username_by_token: dict[str, str] = {}


async def resolve_bot_username_for_widget() -> Tuple[bool, Optional[str], bool]:
    """
    Trả về (widget_available, bot_username không có @, username_resolve_failed).

    - Ưu tiên TELEGRAM_BOT_USERNAME trong .env.
    - Nếu không có, gọi getMe với TELEGRAM_BOT_TOKEN.
    - username_resolve_failed: có token nhưng không lấy được username (token sai / mạng).
    """
    token = (settings.telegram_bot_token or "").strip()
    env_u = (settings.telegram_bot_username or "").strip().lstrip("@")
    if env_u:
        return bool(token), env_u if token else None, False
    if not token:
        return False, None, False
    if token in _username_by_token:
        return True, _username_by_token[token], False
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            data = r.json()
    except Exception as e:
        log.warning("Telegram getMe request failed: %s", e)
        return False, None, True
    if not data.get("ok"):
        log.warning("Telegram getMe not ok: %s", data)
        return False, None, True
    u = (data.get("result") or {}).get("username")
    if not u:
        return False, None, True
    uname = str(u).strip().lstrip("@")
    _username_by_token[token] = uname
    return True, uname, False
