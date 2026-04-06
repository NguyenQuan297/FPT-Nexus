from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_notification_preference import UserNotificationPreference


class NotificationPrefRepository:
    async def get_by_user(
        self, db: AsyncSession, user_id: UUID
    ) -> Optional[UserNotificationPreference]:
        return await db.get(UserNotificationPreference, user_id)

    async def upsert(
        self,
        db: AsyncSession,
        user_id: UUID,
        *,
        telegram_chat_id: Optional[str],
    ) -> UserNotificationPreference:
        row = await self.get_by_user(db, user_id)
        if row is None:
            row = UserNotificationPreference(user_id=user_id)
            db.add(row)
        row.telegram_chat_id = telegram_chat_id
        await db.flush()
        await db.refresh(row)
        return row

    async def list_admin_prefs(self, db: AsyncSession) -> List[UserNotificationPreference]:
        q = (
            select(UserNotificationPreference)
            .join(User, User.id == UserNotificationPreference.user_id)
            .where(User.role == "admin")
        )
        return list((await db.execute(q)).scalars().all())
