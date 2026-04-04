from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead_status_audit import LeadStatusAudit


class LeadAuditRepository:
    async def add(
        self,
        db: AsyncSession,
        *,
        lead_id: UUID,
        actor_user_id: Optional[UUID],
        action: str,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        note: Optional[str] = None,
    ) -> LeadStatusAudit:
        a = LeadStatusAudit(
            id=uuid.uuid4(),
            lead_id=lead_id,
            actor_user_id=actor_user_id,
            action=action,
            old_status=old_status,
            new_status=new_status,
            note=note,
            created_at=datetime.now(timezone.utc),
        )
        db.add(a)
        await db.flush()
        await db.refresh(a)
        return a

    async def list_for_lead(
        self, db: AsyncSession, lead_id: UUID, limit: int = 50
    ) -> List[LeadStatusAudit]:
        q = (
            select(LeadStatusAudit)
            .where(LeadStatusAudit.lead_id == lead_id)
            .order_by(LeadStatusAudit.created_at.desc())
            .limit(limit)
        )
        return list((await db.execute(q)).scalars().all())
