from __future__ import annotations

import unicodedata
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional


def _remove_accents(s: str) -> str:
    """Remove Vietnamese diacritics for accent-insensitive search."""
    # Normalize to NFD (decomposed form), then strip combining marks
    nfkd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower()
    # Mn = Mark, Nonspacing (accents, tone marks, etc.)

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.lead_repository import LeadRepository
from app.schemas.lead import DashboardStats, LeadQueryResponse, RateTrendPoint, TrendPoint
from app.services.lead_display_utils import (
    assignee_matches_query,
    build_username_display_map,
    leads_to_lead_outs,
)
from app.core.call_status import (
    filter_leads_by_contact_call_status_labels,
    lead_extra_call_status_label,
    norm_call_label,
)
from app.core.constants import VALID_LEAD_STATUSES
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


def _lead_has_excel_contact_info(lead) -> bool:
    extra = getattr(lead, "extra", None)
    if not isinstance(extra, dict):
        return False
    return bool(lead_extra_call_status_label(extra))


def _lead_is_excel_uncontacted(lead) -> bool:
    extra = getattr(lead, "extra", None)
    if not isinstance(extra, dict):
        return False
    label = norm_call_label(lead_extra_call_status_label(extra))
    if not label:
        return False
    return any(
        token in label
        for token in (
            "chưa liên hệ",
            "chua lien he",
            "chưa gọi",
            "chua goi",
            "not contacted",
        )
    )


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
    contact_call_statuses: Optional[List[str]] = None,
    call_status_groups: Optional[List[str]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    enrollment_bucket: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> LeadQueryResponse:
    assignee_query = (assigned_to or "").strip()
    if current_user.role == "admin":
        af, sale_exact = None, None
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

    # Text search (non-digit): filter by name, external_id, phone in Python
    # Uses accent-insensitive matching so "khanh" matches "Khánh"
    search_q = (phone_search or "").strip()
    if search_q and not search_q.replace(" ", "").isdigit():
        sq = _remove_accents(search_q)
        rows = [
            r for r in rows
            if sq in _remove_accents(r.name or "")
            or sq in _remove_accents(r.external_id or "")
            or sq in (r.phone or "").lower()
            or sq in _remove_accents(r.assigned_to or "")
        ]

    if assignee_query:
        usernames = {(r.assigned_to or "").strip() for r in rows if (r.assigned_to or "").strip()}
        display_map = await build_username_display_map(db, usernames)
        rows = [r for r in rows if assignee_matches_query(r, assignee_query, display_map)]

    if statuses:
        status_set = {s.strip() for s in statuses if s and s.strip()}
        workflow_statuses = {s for s in status_set if s in VALID_LEAD_STATUSES and s != "new"}
        include_new_blank_contact_info = "new" in status_set
        include_uncontacted_excel = "uncontacted" in status_set
        rows = [
            r
            for r in rows
            if (
                (r.status in workflow_statuses)
                or (
                    include_new_blank_contact_info
                    and r.status == "new"
                    and not _lead_has_excel_contact_info(r)
                )
                or (include_uncontacted_excel and _lead_is_excel_uncontacted(r))
            )
        ]

    rows = filter_leads_by_contact_call_status_labels(rows, contact_call_statuses)

    if call_status_groups:
        from app.core.call_status import lead_extra_call_status_label, norm_call_label as _ncl
        _NO_CONTACT = {"", _ncl("Chưa gọi"), _ncl("Chưa liên hệ")}
        _CONTACTING = {
            _ncl(x) for x in (
                "Chưa nghe máy lần 1", "Chưa nghe máy lần 2", "Chưa nghe máy lần 3",
                "Gọi lại sau", "Thuê bao", "Máy bận",
                "Đã gọi - Không nghe máy", "Đã gọi - Thuê bao", "Đã gọi - Bận",
                "Đã gọi - Hẹn gọi lại", "Đã gọi - Nhầm máy",
            )
        }
        _CONTACTED = {
            _ncl(x) for x in (
                "Đã nghe máy",
                "Đã gọi - Quan tâm", "Đã gọi - Tiềm năng", "Đã gọi - Suy nghĩ thêm", "Đã gọi - Không quan tâm",
                "Đã gọi - Đã chốt", "Đã gọi - Đã gửi mail", "Đã gọi - Đã gửi zalo",
                "Đã gọi - Đã gửi báo giá", "Đã gọi - Đã gửi hợp đồng",
                "Đã gọi - Đã thanh toán", "Đã gọi - Đã hoàn thành",
            )
        }
        groups = {g.strip() for g in call_status_groups if g.strip()}
        filtered = []
        for r in rows:
            ex = getattr(r, "extra", None)
            lbl = _ncl(lead_extra_call_status_label(ex if isinstance(ex, dict) else None))
            if "chua_lien_he" in groups and (lbl in _NO_CONTACT or r.status == "new"):
                filtered.append(r); continue
            if "dang_lien_he" in groups and lbl in _CONTACTING:
                filtered.append(r); continue
            if "da_lien_he" in groups and lbl in _CONTACTED:
                filtered.append(r); continue
            if "khac" in groups and lbl not in _NO_CONTACT and lbl not in _CONTACTING and lbl not in _CONTACTED:
                filtered.append(r); continue
        rows = filtered
        if "chua_lien_he" in groups:
            _chua_lien_he_label = _ncl("Chưa liên hệ")
            rows.sort(
                key=lambda r: (
                    0 if _ncl(lead_extra_call_status_label(
                        r.extra if isinstance(r.extra, dict) else None
                    )) == _chua_lien_he_label else 1
                )
            )

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

    # Filter by enrollment bucket (NKR / REG / NB / NE) from Excel extra field
    if enrollment_bucket:
        eb = enrollment_bucket.strip().upper()
        if eb in ("REG", "NB", "NE"):
            rows = [
                r for r in rows
                if _normalize_enrollment_bucket((r.extra or {}).get("Tình trạng nhập học")) == eb
            ]
        elif eb == "NKR":
            rows = [
                r for r in rows
                if _normalize_enrollment_bucket((r.extra or {}).get("Tình trạng nhập học")) is None
            ]

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

    def _append_day_point(d: date, day_label: str) -> None:
        day_rows = [r for r in rows if _same_utc_day(r.created_at, d)]
        count = len(day_rows)
        contacted_count = sum(1 for r in day_rows if r.last_contact_at is not None)
        reg_day_count = sum(
            1
            for r in day_rows
            if _normalize_enrollment_bucket((r.extra or {}).get("Tình trạng nhập học")) == "REG"
        )
        trend_7d.append(TrendPoint(day=day_label, value=count))
        contact_rate_7d.append(
            RateTrendPoint(
                day=day_label,
                value=round((contacted_count / count) * 100.0, 2) if count else 0.0,
            )
        )
        conversion_rate_7d.append(
            RateTrendPoint(
                day=day_label,
                value=round((reg_day_count / count) * 100.0, 2) if count else 0.0,
            )
        )

    if current_user.role == "admin":
        if rows:
            first_day = min(
                (r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)).date()
                for r in rows
            )
        else:
            first_day = today
        last_day = today
        d = first_day
        while d <= last_day:
            _append_day_point(d, d.isoformat())
            d += timedelta(days=1)
    else:
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            _append_day_point(d, f"{d.month}/{d.day}")

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
