from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.lead_repository import LeadRepository
from app.schemas.reports import ConversionRowOut, MonthlyReportOut, PriorityLeadOut, SaleMonthlySlice
from app.services.sla_service import is_lead_overdue

lead_repo = LeadRepository()


def _normalize_enrollment_bucket(raw: object) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if not text:
        return None
    if "reg" in text or "đăng ký" in text or "ghi danh" in text:
        return "REG"
    if "nb" in text or "booking" in text or "giữ chỗ" in text:
        return "NB"
    if text == "ne" or "nhập học" in text:
        return "NE"
    return None


async def monthly_report(
    db: AsyncSession, year: int, month: int, *, worst_min_days: int = 31, worst_max_days: int = 35
) -> MonthlyReportOut:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_exclusive = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_exclusive = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    leads = await lead_repo.leads_created_between(db, start, end_exclusive)
    total_leads_created = len(leads)
    now = datetime.now(timezone.utc)
    overdue_leads = [
        L
        for L in leads
        if is_lead_overdue(
            created_at=L.created_at,
            last_contact_at=L.last_contact_at,
            status=L.status,
            sla_hours=L.sla_hours_at_ingest,
            now=now,
        )
    ]
    total_overdue = len(overdue_leads)
    sla_compliance_pct = (
        round(((total_leads_created - total_overdue) / total_leads_created) * 100.0, 2)
        if total_leads_created
        else 100.0
    )

    grouped: Dict[str, List] = {}
    for L in leads:
        key = (L.assigned_to or "Chua gan").strip() or "Chua gan"
        grouped.setdefault(key, []).append(L)

    by_sale: List[SaleMonthlySlice] = []
    conversion_by_assignee: List[ConversionRowOut] = []
    for assignee, rows in sorted(grouped.items(), key=lambda x: x[0].lower()):
        overdue = sum(
            1
            for L in rows
            if is_lead_overdue(
                created_at=L.created_at,
                last_contact_at=L.last_contact_at,
                status=L.status,
                sla_hours=L.sla_hours_at_ingest,
                now=now,
            )
        )
        compliance = round(((len(rows) - overdue) / len(rows)) * 100.0, 2) if rows else 100.0
        by_sale.append(
            SaleMonthlySlice(
                assignee=assignee,
                total_leads=len(rows),
                overdue_leads=overdue,
                sla_compliance_pct=compliance,
            )
        )
        reg_count = 0
        nb_count = 0
        ne_count = 0
        for L in rows:
            bucket = _normalize_enrollment_bucket((L.extra or {}).get("Tình trạng nhập học"))
            if bucket == "REG":
                reg_count += 1
            elif bucket == "NB":
                nb_count += 1
            elif bucket == "NE":
                ne_count += 1
        conversion_by_assignee.append(
            ConversionRowOut(
                assignee=assignee,
                total_leads=len(rows),
                reg_count=reg_count,
                nb_count=nb_count,
                ne_count=ne_count,
            )
        )

    # Top worst leads in requested age window (default 31-35 days)
    scored = []
    for L in overdue_leads:
        c = L.created_at
        if c.tzinfo is None:
            c = c.replace(tzinfo=timezone.utc)
        age_days = (now - c).total_seconds() / 86400.0
        if worst_min_days <= age_days <= worst_max_days:
            scored.append((age_days, L))
    scored.sort(key=lambda x: x[0], reverse=True)
    top_priority = [
        PriorityLeadOut(
            id=L.id,
            name=L.name or "(Khong ten)",
            phone=L.phone,
            assignee=L.assigned_to,
            status=L.status,
            created_at=L.created_at.isoformat(),
            last_contact_at=L.last_contact_at.isoformat() if L.last_contact_at else None,
        )
        for _, L in scored[:10]
    ]

    return MonthlyReportOut(
        year=year,
        month=month,
        total_leads_created=total_leads_created,
        overdue_leads=total_overdue,
        sla_compliance_pct=round(sla_compliance_pct, 2),
        by_sale=by_sale,
        top_priority_leads=top_priority,
        conversion_by_assignee=conversion_by_assignee,
    )
