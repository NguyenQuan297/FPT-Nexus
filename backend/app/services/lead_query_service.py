from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import DashboardStats, LeadQueryResponse, RateTrendPoint, TrendPoint
from app.services.lead_display_utils import leads_to_lead_outs
from app.services.sla_service import sla_deadline


def _same_utc_day(dt: datetime, day: date) -> bool:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).date() == day


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


async def query_leads_page(
    db: AsyncSession,
    *,
    repo: LeadRepository,
    current_user: User,
    assigned_to: Optional[str] = None,
    phone_search: Optional[str] = None,
    overdue_only: bool = False,
    uncontacted_only: bool = False,
    statuses: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 20,
) -> LeadQueryResponse:
    if current_user.role == "admin":
        af, sale_exact = assigned_to, None
    else:
        af, sale_exact = None, current_user.username

    rows = await repo.list_leads(
        db,
        assigned_to=af,
        status=None,
        phone_search=phone_search,
        overdue_only=overdue_only,
        sale_username_exact=sale_exact,
        limit=100000,
        offset=0,
    )

    if statuses:
        status_set = {s.strip() for s in statuses if s and s.strip()}
        rows = [r for r in rows if r.status in status_set]

    if date_from:
        start_dt = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
        rows = [
            r
            for r in rows
            if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) >= start_dt
        ]
    if date_to:
        end_dt = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
        rows = [
            r
            for r in rows
            if (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)) <= end_dt
        ]

    if uncontacted_only:
        rows = [r for r in rows if r.last_contact_at is None and r.status != "closed"]

    total = len(rows)
    page = max(1, page)
    limit = max(1, min(limit, 100))
    start = (page - 1) * limit
    items_raw = rows[start : start + limit]
    items = await leads_to_lead_outs(db, items_raw)

    today = datetime.now(timezone.utc).date()
    now = datetime.now(timezone.utc)
    uncontacted = sum(1 for r in rows if r.last_contact_at is None and r.status != "closed")
    active_leads = sum(1 for r in rows if r.status == "active")
    contacting = sum(1 for r in rows if r.status == "contacting")
    late = sum(1 for r in rows if r.status == "late")
    contacted_today = sum(1 for r in rows if r.last_contact_at and _same_utc_day(r.last_contact_at, today))

    overdue = 0
    at_risk = 0
    reg_count = 0
    for r in rows:
        if _normalize_enrollment_bucket((r.extra or {}).get("Tình trạng nhập học")) == "REG":
            reg_count += 1
        if r.status == "closed" or r.last_contact_at is not None:
            continue
        created = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
        age_h = (now - created).total_seconds() / 3600
        if 12 <= age_h < 16:
            at_risk += 1
        if sla_deadline(created, r.sla_hours_at_ingest) < now:
            overdue += 1
    conversion_reg_pct = round((reg_count / total) * 100.0, 2) if total else 0.0

    daily_misses_today = None
    if current_user.role == "admin":
        try:
            from app.repositories.daily_miss_repository import DailyMissRepository

            daily_misses_today = await DailyMissRepository().sum_for_date(db, today)
        except Exception:
            daily_misses_today = None

    stats = DashboardStats(
        total_leads=total,
        uncontacted=uncontacted,
        active_leads=active_leads,
        contacting=contacting,
        overdue=overdue,
        at_risk=at_risk,
        late=late,
        conversion_reg_pct=conversion_reg_pct,
        contacted_today=contacted_today,
        daily_misses_today=daily_misses_today,
    )

    trend_7d: List[TrendPoint] = []
    contact_rate_7d: List[RateTrendPoint] = []
    conversion_rate_7d: List[RateTrendPoint] = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_rows = [r for r in rows if _same_utc_day(r.created_at, d)]
        count = len(day_rows)
        contacted_count = sum(1 for r in day_rows if r.last_contact_at is not None)
        reg_day_count = sum(
            1 for r in day_rows if _normalize_enrollment_bucket((r.extra or {}).get("Tình trạng nhập học")) == "REG"
        )
        trend_7d.append(TrendPoint(day=f"{d.month}/{d.day}", value=count))
        contact_rate_7d.append(
            RateTrendPoint(
                day=f"{d.month}/{d.day}",
                value=round((contacted_count / count) * 100.0, 2) if count else 0.0,
            )
        )
        conversion_rate_7d.append(
            RateTrendPoint(
                day=f"{d.month}/{d.day}",
                value=round((reg_day_count / count) * 100.0, 2) if count else 0.0,
            )
        )

    return LeadQueryResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        stats=stats,
        trend_7d=trend_7d,
        contact_rate_7d=contact_rate_7d,
        conversion_rate_7d=conversion_rate_7d,
    )
