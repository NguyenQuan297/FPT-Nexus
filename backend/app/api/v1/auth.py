from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserMe
from app.services import auth_service, notify_service, presence_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.authenticate(db, body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    await presence_service.touch_online(user.id)
    token = auth_service.issue_token(user)
    if user.role == "sale":
        display = (getattr(user, "display_name", None) or "").strip() or user.username
        text = f"🟢 Sale {display} (@{user.username}) vừa đăng nhập hệ thống."
        await notify_service.notify_admins_in_app_async(
            db, title="Sale đăng nhập", body=text,
        )
        await notify_service.notify_admin_action_async(
            text=text, actor_user_id=None,
        )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMe)
async def me(user: User = Depends(get_current_user)):
    return UserMe.model_validate(user)


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    await presence_service.set_offline(user.id)
    return {"ok": True}
