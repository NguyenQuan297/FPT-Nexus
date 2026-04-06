from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.core.config import settings
from app.models.user import User
from app.repositories.notification_pref_repository import NotificationPrefRepository
from app.schemas.notification_settings import (
    NotificationChannelsOut,
    NotificationChannelsUpdate,
    TelegramWidgetAuth,
    TelegramWidgetStatus,
)
from app.services import telegram_bot_info, telegram_login

router = APIRouter(prefix="/settings", tags=["settings"])
_pref_repo = NotificationPrefRepository()


def _norm_opt(s: str | None) -> str | None:
    if s is None:
        return None
    t = s.strip()
    return t or None


@router.get("/telegram-widget", response_model=TelegramWidgetStatus)
async def telegram_widget_status(_: User = Depends(require_admin)):
    token = (settings.telegram_bot_token or "").strip()
    available, uname, resolve_failed = await telegram_bot_info.resolve_bot_username_for_widget()
    return TelegramWidgetStatus(
        widget_available=available,
        bot_username=uname,
        has_bot_token=bool(token),
        username_resolve_failed=resolve_failed,
    )


@router.post("/telegram-link", response_model=NotificationChannelsOut)
async def telegram_link_save(
    body: TelegramWidgetAuth,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    token = (settings.telegram_bot_token or "").strip()
    if not token:
        raise HTTPException(
            status_code=503,
            detail="Server chưa cấu hình TELEGRAM_BOT_TOKEN.",
        )
    try:
        tg_id = telegram_login.verify_telegram_login_widget(
            body.model_dump(exclude_none=True),
            token,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    row = await _pref_repo.upsert(db, user.id, telegram_chat_id=str(tg_id))
    await db.commit()
    return NotificationChannelsOut(telegram_chat_id=row.telegram_chat_id)


@router.get("/notification-channels", response_model=NotificationChannelsOut)
async def get_notification_channels(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    row = await _pref_repo.get_by_user(db, user.id)
    if not row:
        return NotificationChannelsOut()
    return NotificationChannelsOut(telegram_chat_id=row.telegram_chat_id)


@router.put("/notification-channels", response_model=NotificationChannelsOut)
async def put_notification_channels(
    body: NotificationChannelsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    existing = await _pref_repo.get_by_user(db, user.id)
    patch = body.model_dump(exclude_unset=True)
    tg = existing.telegram_chat_id if existing else None
    if "telegram_chat_id" in patch:
        tg = _norm_opt(patch["telegram_chat_id"])
    row = await _pref_repo.upsert(db, user.id, telegram_chat_id=tg)
    await db.commit()
    return NotificationChannelsOut(telegram_chat_id=row.telegram_chat_id)
