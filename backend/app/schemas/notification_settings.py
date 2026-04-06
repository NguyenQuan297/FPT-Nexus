from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class NotificationChannelsOut(BaseModel):
    telegram_chat_id: Optional[str] = None


class NotificationChannelsUpdate(BaseModel):
    telegram_chat_id: Optional[str] = Field(
        default=None,
        description="Telegram chat_id; messages sent via TELEGRAM_BOT_TOKEN.",
    )


class TelegramWidgetAuth(BaseModel):
    """Payload từ Telegram Login Widget (data-onauth)."""

    id: int
    first_name: str
    auth_date: int
    hash: str
    username: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None


class TelegramWidgetStatus(BaseModel):
    widget_available: bool
    bot_username: Optional[str] = None
    has_bot_token: bool = False
    #: True khi có token nhưng không lấy được username (token sai / chặn mạng / getMe lỗi)
    username_resolve_failed: bool = False
