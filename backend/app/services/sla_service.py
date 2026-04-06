from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import LEAD_STATUS_LATE
from app.repositories.lead_repository import LeadRepository
from app.realtime.events import publish_event
from app.services import excel_sync_service, notification_copy, notify_service

log = logging.getLogger(__name__)


def sla_deadline(created_at: datetime, sla_hours: Optional[float] = None) -> datetime:
    h = sla_hours if sla_hours is not None else settings.sla_hours
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at + timedelta(hours=h)


def is_lead_overdue(
    *,
    created_at: datetime,
    last_contact_at: Optional[datetime],
    status: str,
    sla_hours: Optional[float] = None,
    now: Optional[datetime] = None,
) -> bool:
    now = now or datetime.now(timezone.utc)
    if status == "closed":
        return False
    if last_contact_at is not None:
        return False
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return now > sla_deadline(created_at, sla_hours)


def is_overdue_new(
    created_at: datetime, status: str, now: Optional[datetime] = None
) -> bool:
    now = now or datetime.now(timezone.utc)
    if status != "new":
        return False
    return now > sla_deadline(created_at)


repo = LeadRepository()


async def run_sla_pass(db: AsyncSession) -> int:
    """Mark leads as late when there has been no contact and SLA window passed."""
    now = datetime.now(timezone.utc)
    leads = await repo.list_for_sla_late_marking(db)
    updated = 0
    for lead in leads:
        created = lead.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if now <= sla_deadline(created, lead.sla_hours_at_ingest or settings.sla_hours):
            continue
        summary = notification_copy.sla_lead_one_line(lead)
        extra: dict = {"status": LEAD_STATUS_LATE}
        if lead.last_alert_sent_at is None:
            await notify_service.notify_sla_violation_async(db, summary)
            extra["last_alert_sent_at"] = now
        await repo.update_lead(db, lead, **extra)
        await publish_event(
            "lead.sla_overdue",
            {
                "lead_id": str(lead.id),
                "name": lead.name,
                "phone": lead.phone,
                "assigned_to": lead.assigned_to,
                "status": LEAD_STATUS_LATE,
            },
        )
        updated += 1
    log.info("SLA pass: marked %s leads as late", updated)
    if updated:
        await excel_sync_service.generate_latest_excel()
    return updated


async def event_based_sla_check(db: AsyncSession, lead) -> bool:
    """
    Lightweight SLA check on lead create/update events.
    Returns True when lead was marked late.
    """
    if lead.status == LEAD_STATUS_LATE:
        return False
    if lead.last_contact_at is not None:
        return False
    created = lead.created_at
    now = datetime.now(timezone.utc)
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if now <= sla_deadline(created, lead.sla_hours_at_ingest or settings.sla_hours):
        return False
    await repo.update_lead(db, lead, status=LEAD_STATUS_LATE)
    await publish_event(
        "lead.sla_overdue",
        {
            "lead_id": str(lead.id),
            "name": lead.name,
            "phone": lead.phone,
            "assigned_to": lead.assigned_to,
            "status": LEAD_STATUS_LATE,
        },
    )
    return True
