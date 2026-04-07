from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository

repo = UserRepository()


async def authenticate(
    db: AsyncSession, username: str, password: str
) -> Optional[User]:
    uname = (username or "").strip()
    if not uname:
        return None
    user = await repo.get_by_username(db, uname)
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def issue_token(user: User) -> str:
    return create_access_token(
        str(user.id),
        extra={"username": user.username, "role": user.role},
    )


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    return await repo.get_by_id(db, user_id)
