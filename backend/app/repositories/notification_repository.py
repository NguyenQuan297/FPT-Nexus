from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.realtime.events import publish_event


class NotificationRepository:
    async def create(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        body: str,
    ) -> Notification:
        n = Notification(user_id=user_id, title=title, body=body)
        db.add(n)
        await db.flush()
        await db.refresh(n)
        await publish_event(
            "notification.created",
            {
                "notification_id": str(n.id),
                "user_id": str(user_id),
                "title": title,
                "body": body,
                "created_at": n.created_at.isoformat(),
            },
        )
        return n

    async def list_for_user(
        self, db: AsyncSession, user_id: UUID, limit: int = 50
    ) -> List[Notification]:
        q = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list((await db.execute(q)).scalars().all())

    async def mark_read(
        self, db: AsyncSession, notif_id: UUID, user_id: UUID
    ) -> Optional[Notification]:
        n = await db.get(Notification, notif_id)
        if not n or n.user_id != user_id:
            return None
        n.read_at = datetime.now(timezone.utc)
        await db.flush()
        return n
