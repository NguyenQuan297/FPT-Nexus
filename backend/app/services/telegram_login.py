"""Verify Telegram Login Widget callback (https://core.telegram.org/widgets/login)."""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any


def verify_telegram_login_widget(
    auth: dict[str, Any],
    bot_token: str,
    *,
    max_age_sec: int = 86400,
) -> int:
    """
    Validate hash and freshness; return Telegram user id (same as private chat_id for sendMessage).
    """
    token = (bot_token or "").strip()
    check_hash = auth.get("hash")
    if not token or not check_hash or not isinstance(check_hash, str):
        raise ValueError("Thiếu TELEGRAM_BOT_TOKEN hoặc hash từ Telegram.")

    parts = {k: v for k, v in auth.items() if k != "hash" and v is not None}
    if "auth_date" not in parts or "id" not in parts:
        raise ValueError("Payload Telegram không đầy đủ.")

    data_check_string = "\n".join(f"{k}={parts[k]}" for k in sorted(parts.keys()))
    secret_key = hashlib.sha256(token.encode()).digest()
    calculated = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if calculated != check_hash:
        raise ValueError("Chữ ký Telegram không hợp lệ — thử liên kết lại.")

    auth_date = int(parts["auth_date"])
    now = int(time.time())
    if abs(now - auth_date) > max_age_sec:
        raise ValueError("Phiên Telegram đã hết hạn — bấm liên kết lại.")

    return int(parts["id"])
