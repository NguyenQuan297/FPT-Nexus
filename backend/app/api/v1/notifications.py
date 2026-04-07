from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.notification_repository import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])
repo = NotificationRepository()


class NotificationOut(BaseModel):
    id: UUID
    title: str
    body: str
    read_at: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = await repo.list_for_user(db, user.id)
    out = []
    for n in rows:
        out.append(
            NotificationOut(
                id=n.id,
                title=n.title,
                body=n.body,
                read_at=n.read_at.isoformat() if n.read_at else None,
                created_at=n.created_at.isoformat(),
            )
        )
    return out


@router.post("/{notif_id}/read")
async def mark_read(
    notif_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = await repo.mark_read(db, notif_id, user.id)
    await db.commit()
    return {"ok": bool(n)}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = await repo.mark_all_read_for_user(db, user.id)
    await db.commit()
    return {"ok": True, "marked": n}
