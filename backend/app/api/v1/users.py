from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.user_admin import UserCreate, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    users = await user_service.list_users(db)
    return users


@router.post("", response_model=UserOut)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    if body.role != "sale":
        raise HTTPException(status_code=400, detail="Admin can only create sale users")
    u = await user_service.create_user(db, body)
    await db.commit()
    return u


@router.patch("/{user_id}", response_model=UserOut)
async def patch_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    u = await user_service.update_user(db, user_id, body)
    await db.commit()
    return u
