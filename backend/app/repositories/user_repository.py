from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    async def get_by_id(
        self, db: AsyncSession, user_id: UUID
    ) -> Optional[User]:
        return await db.get(User, user_id)

    async def get_by_username(
        self, db: AsyncSession, username: str
    ) -> Optional[User]:
        q = select(User).where(User.username == username)
        return (await db.execute(q)).scalar_one_or_none()

    async def get_by_usernames(
        self, db: AsyncSession, usernames: List[str]
    ) -> List[User]:
        if not usernames:
            return []
        q = select(User).where(User.username.in_(usernames))
        return list((await db.execute(q)).scalars().all())

    async def list_users(self, db: AsyncSession) -> List[User]:
        q = select(User).order_by(User.username)
        return list((await db.execute(q)).scalars().all())

    async def create(
        self,
        db: AsyncSession,
        username: str,
        password_hash: str,
        role: str,
        display_name: Optional[str] = None,
    ) -> User:
        u = User(
            username=username,
            password_hash=password_hash,
            role=role,
            display_name=display_name,
        )
        db.add(u)
        await db.flush()
        await db.refresh(u)
        return u

    async def save(self, db: AsyncSession, user: User) -> User:
        await db.flush()
        await db.refresh(user)
        return user
