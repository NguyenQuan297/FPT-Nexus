from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user_admin import UserCreate, UserUpdate

repo = UserRepository()


async def create_user(db: AsyncSession, body: UserCreate) -> User:
    existing = await repo.get_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    if body.role not in ("admin", "sale"):
        raise HTTPException(status_code=400, detail="Invalid role")
    pw = hash_password(body.password)
    return await repo.create(db, body.username, pw, body.role)


async def update_user(db: AsyncSession, user_id: UUID, body: UserUpdate) -> User:
    user = await repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role is not None:
        if body.role not in ("admin", "sale"):
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.password_hash = hash_password(body.password)
    return await repo.save(db, user)


async def list_users(db: AsyncSession) -> List[User]:
    return await repo.list_users(db)


async def get_user(db: AsyncSession, user_id: UUID) -> Optional[User]:
    return await repo.get_by_id(db, user_id)
