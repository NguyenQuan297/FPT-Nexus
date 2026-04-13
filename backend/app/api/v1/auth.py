from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserMe
from app.services import auth_service, notify_service, presence_service

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger(__name__)

_background_tasks: set[asyncio.Task] = set()


async def _notify_sale_login(username: str, display: str) -> None:
    text = f"🟢 Sale {display} (@{username}) vừa đăng nhập hệ thống."
    try:
        async with AsyncSessionLocal() as nb_db:
            await notify_service.notify_admins_in_app_async(
                nb_db, title="Sale đăng nhập", body=text,
            )
            await nb_db.commit()
    except Exception:
        log.exception("Failed to write in-app login notification for sale '%s'", username)
    try:
        await notify_service.notify_admin_action_async(text=text, actor_user_id=None)
    except Exception:
        log.exception("Failed to send Telegram login notification for sale '%s'", username)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.authenticate(db, body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    await presence_service.touch_online(user.id)
    token = auth_service.issue_token(user)
    if user.role == "sale":
        display = (getattr(user, "display_name", None) or "").strip() or user.username
        # Fire-and-forget: notifications must never block or fail the login response.
        task = asyncio.create_task(_notify_sale_login(user.username, display))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMe)
async def me(user: User = Depends(get_current_user)):
    return UserMe.model_validate(user)


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    await presence_service.set_offline(user.id)
    return {"ok": True}
