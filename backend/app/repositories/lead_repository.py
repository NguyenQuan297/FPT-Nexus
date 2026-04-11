from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import LEAD_STATUS_CLOSED, LEAD_STATUS_LATE
from app.models.lead import Lead


class LeadRepository:
    async def create(self, db: AsyncSession, data: Dict[str, Any]) -> Lead:
        lead = Lead(**data)
        db.add(lead)
        await db.flush()
        await db.refresh(lead)
        return lead

    async def get_by_id(self, db: AsyncSession, lead_id: UUID) -> Optional[Lead]:
        return await db.get(Lead, lead_id)

    async def delete(self, db: AsyncSession, lead_id: UUID) -> bool:
        lead = await db.get(Lead, lead_id)
        if not lead:
            return False
        await db.delete(lead)
        await db.flush()
        return True

    async def get_by_phone(self, db: AsyncSession, phone: str) -> Optional[Lead]:
        q = select(Lead).where(Lead.phone == phone).limit(1)
        return (await db.execute(q)).scalar_one_or_none()

    async def get_by_merge_key(self, db: AsyncSession, phone_normalized: str) -> Optional[Lead]:
        """Primary merge key: phone_normalized; fallback legacy phone match."""
        if not phone_normalized:
            return None
        q = select(Lead).where(Lead.phone_normalized == phone_normalized).limit(1)
        hit = (await db.execute(q)).scalar_one_or_none()
        if hit:
            return hit
        q2 = select(Lead).where(Lead.phone == phone_normalized).limit(1)
        return (await db.execute(q2)).scalar_one_or_none()

    async def list_leads(
        self,
        db: AsyncSession,
        *,
        assigned_to: Optional[str] = None,
        status: Optional[str] = None,
        phone_search: Optional[str] = None,
        overdue_only: bool = False,
        sale_username_exact: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Lead]:
        q = select(Lead).order_by(Lead.created_at.desc())
        if sale_username_exact:
            q = q.where(Lead.assigned_to == sale_username_exact)
        elif assigned_to:
            q = q.where(Lead.assigned_to.ilike(f"%{assigned_to}%"))
        if status:
            q = q.where(Lead.status == status)
        if phone_search:
            pat = f"%{phone_search}%"
            # Only filter phone fields at SQL level; name/id filtering done in service layer
            digits_only = phone_search.strip().replace(" ", "")
            if digits_only.isdigit():
                q = q.where(or_(
                    Lead.phone.ilike(pat),
                    Lead.phone_secondary.ilike(pat),
                    Lead.external_id.ilike(pat),
                ))
        result = await db.execute(q)
        rows = list(result.scalars().all())

        if overdue_only:
            from app.core.call_status import lead_extra_call_status_label, norm_call_label
            from app.services.sla_service import sla_deadline

            _NO_CONTACT = {"", norm_call_label("Chưa gọi"), norm_call_label("Chưa liên hệ")}
            now = datetime.now(timezone.utc)
            filtered: List[Lead] = []
            for lead in rows:
                if lead.status == LEAD_STATUS_CLOSED:
                    continue
                ex = getattr(lead, "extra", None)
                lbl = norm_call_label(lead_extra_call_status_label(ex if isinstance(ex, dict) else None))
                if lbl not in _NO_CONTACT and lead.status != "new":
                    continue
                c = lead.created_at
                if c.tzinfo is None:
                    c = c.replace(tzinfo=timezone.utc)
                if now > sla_deadline(c, lead.sla_hours_at_ingest or settings.sla_hours):
                    filtered.append(lead)
            rows = filtered

        return rows[offset : offset + limit]

    def _assigned_clause(self, assigned_to: Optional[str]):
        if not assigned_to:
            return None
        return Lead.assigned_to.ilike(f"%{assigned_to}%")

    async def count_total(
        self,
        db: AsyncSession,
        assigned_to: Optional[str] = None,
        sale_username: Optional[str] = None,
    ) -> int:
        stmt = select(func.count()).select_from(Lead)
        if sale_username:
            stmt = stmt.where(Lead.assigned_to == sale_username)
        else:
            f = self._assigned_clause(assigned_to)
            if f is not None:
                stmt = stmt.where(f)
        return (await db.execute(stmt)).scalar_one()

    async def count_uncontacted(
        self,
        db: AsyncSession,
        assigned_to: Optional[str] = None,
        sale_username: Optional[str] = None,
    ) -> int:
        """last_contact_at IS NULL and not closed."""
        parts = [
            Lead.last_contact_at.is_(None),
            Lead.status != LEAD_STATUS_CLOSED,
        ]
        if sale_username:
            parts.append(Lead.assigned_to == sale_username)
        else:
            f = self._assigned_clause(assigned_to)
            if f is not None:
                parts.append(f)
        stmt = select(func.count()).select_from(Lead).where(and_(*parts))
        return (await db.execute(stmt)).scalar_one()

    async def count_by_statuses(
        self,
        db: AsyncSession,
        statuses: List[str],
        assigned_to: Optional[str] = None,
        sale_username: Optional[str] = None,
    ) -> int:
        stmt = select(func.count()).select_from(Lead).where(Lead.status.in_(statuses))
        if sale_username:
            stmt = stmt.where(Lead.assigned_to == sale_username)
        else:
            f = self._assigned_clause(assigned_to)
            if f is not None:
                stmt = stmt.where(f)
        return (await db.execute(stmt)).scalar_one()

    async def count_by_status(
        self,
        db: AsyncSession,
        status: str,
        assigned_to: Optional[str] = None,
        sale_username: Optional[str] = None,
    ) -> int:
        parts = [Lead.status == status]
        if sale_username:
            parts.append(Lead.assigned_to == sale_username)
        else:
            f = self._assigned_clause(assigned_to)
            if f is not None:
                parts.append(f)
        stmt = select(func.count()).select_from(Lead).where(and_(*parts))
        return (await db.execute(stmt)).scalar_one()

    async def count_overdue_uncontacted(
        self,
        db: AsyncSession,
        assigned_to: Optional[str] = None,
        sale_username: Optional[str] = None,
    ) -> int:
        """No contact yet + past SLA; excludes closed."""
        now = datetime.now(timezone.utc)
        q = select(Lead).where(
            Lead.last_contact_at.is_(None),
            Lead.status != LEAD_STATUS_CLOSED,
        )
        if sale_username:
            q = q.where(Lead.assigned_to == sale_username)
        elif assigned_to:
            q = q.where(Lead.assigned_to.ilike(f"%{assigned_to}%"))
        rows = list((await db.execute(q)).scalars().all())
        from app.services.sla_service import sla_deadline

        n = 0
        for lead in rows:
            c = lead.created_at
            if c.tzinfo is None:
                c = c.replace(tzinfo=timezone.utc)
            if now > sla_deadline(c, lead.sla_hours_at_ingest or settings.sla_hours):
                n += 1
        return n

    async def list_for_sla_late_marking(self, db: AsyncSession) -> List[Lead]:
        """Leads with no contact, past SLA, not closed — candidates for 'late'."""
        q = select(Lead).where(
            Lead.last_contact_at.is_(None),
            Lead.status != LEAD_STATUS_CLOSED,
            Lead.status != LEAD_STATUS_LATE,
        )
        return list((await db.execute(q)).scalars().all())

    async def list_by_status(
        self, db: AsyncSession, status: str
    ) -> List[Lead]:
        q = select(Lead).where(Lead.status == status)
        result = await db.execute(q)
        return list(result.scalars().all())

    async def update_lead(
        self, db: AsyncSession, lead: Lead, **kwargs: Any
    ) -> Lead:
        for k, v in kwargs.items():
            setattr(lead, k, v)
        await db.flush()
        await db.refresh(lead)
        return lead

    async def leads_created_between(
        self,
        db: AsyncSession,
        start: datetime,
        end: datetime,
    ) -> List[Lead]:
        q = select(Lead).where(
            Lead.created_at >= start,
            Lead.created_at < end,
        )
        result = await db.execute(q)
        return list(result.scalars().all())

    async def list_ids_by_ids_for_user(
        self,
        db: AsyncSession,
        lead_ids: List[UUID],
        sale_username: Optional[str],
    ) -> List[Lead]:
        q = select(Lead).where(Lead.id.in_(lead_ids))
        if sale_username:
            q = q.where(Lead.assigned_to == sale_username)
        return list((await db.execute(q)).scalars().all())

    async def reassign_leads_from_label_to_username(
        self,
        db: AsyncSession,
        *,
        old_label: str,
        new_username: str,
    ) -> int:
        old = (old_label or "").strip()
        new_u = (new_username or "").strip()
        if not old or not new_u:
            return 0
        now = datetime.now(timezone.utc)
        bind = db.get_bind()
        dialect = getattr(getattr(bind, "dialect", None), "name", "") or ""

        if dialect == "postgresql":
            r = await db.execute(
                text(
                    """
                    UPDATE leads SET
                        assigned_to = :new_u,
                        updated_at = :now,
                        extra = jsonb_set(
                            COALESCE(extra, '{}'::jsonb),
                            '{assignee_display_label}',
                            to_jsonb(CAST(:old_label AS TEXT))
                        )
                    WHERE assigned_to = :old_label
                    """
                ),
                {"new_u": new_u, "now": now, "old_label": old},
            )
            return int(r.rowcount or 0)

        q = select(Lead).where(Lead.assigned_to == old)
        rows = list((await db.execute(q)).scalars().all())
        for lead in rows:
            lead.assigned_to = new_u
            lead.updated_at = now
            ex = dict(lead.extra or {})
            ex["assignee_display_label"] = old
            lead.extra = ex
        await db.flush()
        return len(rows)

    async def list_distinct_assignees(self, db: AsyncSession) -> List[str]:
        q = (
            select(func.distinct(Lead.assigned_to))
            .where(Lead.assigned_to.is_not(None))
            .order_by(Lead.assigned_to.asc())
        )
        vals = [x for x in (await db.execute(q)).scalars().all() if x and str(x).strip()]
        return [str(v).strip() for v in vals]
