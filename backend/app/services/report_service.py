from __future__ import annotations

from datetime import date as date_mod, datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.lead_repository import LeadRepository
from app.repositories.user_repository import UserRepository
from app.core.call_status import lead_extra_call_status_label, norm_call_label
from app.schemas.reports import (
    BranchSummary,
    ConversionRowOut,
    MonthlyReportOut,
    PriorityLeadOut,
    SaleMonthlySlice,
    StatusBreakdownRow,
)
from app.services.sla_service import is_lead_overdue

lead_repo = LeadRepository()
user_repo = UserRepository()

BRANCH_HAI_PHONG = "FSC Hải Phòng"
BRANCH_OTHER = "Cơ sở khác"


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


def _classify_call_status(label: str) -> str:
    """Classify a call-status label into one of 6 interest buckets."""
    n = norm_call_label(label)
    if not n or n == norm_call_label("Chưa gọi"):
        return "chua_cap_nhat"
    if any(x in n for x in ("quan tâm",)) and "không" not in n:
        return "quan_tam"
    if any(x in n for x in ("hẹn gọi lại", "suy nghĩ", "gọi lại sau", "bận")):
        return "suy_nghi_them"
    if any(x in n for x in ("tiềm năng", "gửi mail", "gửi zalo", "báo giá", "hợp đồng", "đã chốt", "thanh toán", "hoàn thành")):
        return "tiem_nang"
    if "không quan tâm" in n:
        return "khong_quan_tam"
    if any(x in n for x in ("không nghe máy", "thuê bao", "nhầm máy", "không phù hợp")):
        return "khong_phu_hop"
    return "chua_cap_nhat"


def _detect_branch(assignee_display: str) -> str:
    """If assignee name contains 'FSC Hải Phòng' or 'Hải Phòng', classify as Hải Phòng branch."""
    lower = assignee_display.lower()
    if "hải phòng" in lower or "hai phong" in lower:
        return BRANCH_HAI_PHONG
    return BRANCH_OTHER


async def date_range_report(
    db: AsyncSession, date_from: date_mod, date_to: date_mod, *, worst_max_days: int = 35
) -> MonthlyReportOut:
    start = datetime(date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc)
    end_exclusive = datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59, tzinfo=timezone.utc)
    leads = await lead_repo.leads_created_between(db, start, end_exclusive + timedelta(seconds=1))
    return await _build_report(db, leads, date_from.year, date_from.month, worst_max_days=worst_max_days)


async def monthly_report(
    db: AsyncSession, year: int, month: int, *, worst_max_days: int = 35
) -> MonthlyReportOut:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_exclusive = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_exclusive = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    leads = await lead_repo.leads_created_between(db, start, end_exclusive)
    return await _build_report(db, leads, year, month, worst_max_days=worst_max_days)


async def _build_report(
    db: AsyncSession, leads, year: int, month: int, *, worst_max_days: int = 35
) -> MonthlyReportOut:
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

    assigned_usernames = {
        (L.assigned_to or "").strip()
        for L in leads
        if (L.assigned_to or "").strip()
    }
    users = await user_repo.get_by_usernames(db, list(assigned_usernames))
    user_display_map = {
        u.username: ((u.display_name or "").strip() or u.username)
        for u in users
    }

    def assignee_display_name(L) -> str:
        extra = L.extra if isinstance(L.extra, dict) else {}
        label = str(extra.get("assignee_display_label") or "").strip()
        if label:
            return label
        raw = (L.assigned_to or "").strip()
        if not raw:
            return "Chưa gán"
        return user_display_map.get(raw, raw)

    grouped: Dict[str, List] = {}
    for L in leads:
        key = assignee_display_name(L)
        grouped.setdefault(key, []).append(L)

    # Global enrollment counts
    total_reg = 0
    total_nb = 0
    total_ne = 0

    by_sale: List[SaleMonthlySlice] = []
    conversion_by_assignee: List[ConversionRowOut] = []
    status_breakdown: List[StatusBreakdownRow] = []

    for assignee, rows in sorted(grouped.items(), key=lambda x: x[0].lower()):
        branch = _detect_branch(assignee)
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
                branch=branch,
                total_leads=len(rows),
                overdue_leads=overdue,
                sla_compliance_pct=compliance,
            )
        )
        reg_count = 0
        nb_count = 0
        ne_count = 0
        sb = StatusBreakdownRow(assignee=assignee, branch=branch)
        for L in rows:
            bucket = _normalize_enrollment_bucket((L.extra or {}).get("Tình trạng nhập học"))
            if bucket == "REG":
                reg_count += 1
            elif bucket == "NB":
                nb_count += 1
            elif bucket == "NE":
                ne_count += 1
            call_label = lead_extra_call_status_label(L.extra if isinstance(L.extra, dict) else None)
            cat = _classify_call_status(call_label)
            setattr(sb, cat, getattr(sb, cat) + 1)
        total_reg += reg_count
        total_nb += nb_count
        total_ne += ne_count
        reg_pct = round((reg_count / len(rows)) * 100.0, 1) if rows else 0.0
        conversion_by_assignee.append(
            ConversionRowOut(
                assignee=assignee,
                branch=branch,
                total_leads=len(rows),
                reg_count=reg_count,
                nb_count=nb_count,
                ne_count=ne_count,
                reg_pct=reg_pct,
            )
        )
        status_breakdown.append(sb)

    # Branch summaries
    branch_data: Dict[str, BranchSummary] = {}
    for conv in conversion_by_assignee:
        b = branch_data.setdefault(conv.branch, BranchSummary(name=conv.branch))
        b.total_leads += conv.total_leads
        b.total_reg += conv.reg_count
        b.total_nb += conv.nb_count
        b.total_ne += conv.ne_count
        b.tvv_count += 1
    for b in branch_data.values():
        b.reg_pct = round((b.total_reg / b.total_leads) * 100.0, 1) if b.total_leads else 0.0

    # Ensure Hải Phòng first, then others
    branches = sorted(branch_data.values(), key=lambda b: (0 if b.name == BRANCH_HAI_PHONG else 1, b.name))

    # Unique TVV count (excluding "Chưa gán")
    tvv_count = sum(1 for a in grouped if a != "Chưa gán")
    global_reg_pct = round((total_reg / total_leads_created) * 100.0, 1) if total_leads_created else 0.0

    # Top worst leads
    scored = []
    for L in overdue_leads:
        c = L.created_at
        if c.tzinfo is None:
            c = c.replace(tzinfo=timezone.utc)
        age_days = (now - c).total_seconds() / 86400.0
        if age_days <= worst_max_days:
            scored.append((age_days, L))
    scored.sort(key=lambda x: x[0], reverse=True)
    top_priority = [
        PriorityLeadOut(
            id=L.id,
            name=L.name or "(Khong ten)",
            phone=L.phone,
            assignee=assignee_display_name(L),
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
        total_reg=total_reg,
        total_nb=total_nb,
        total_ne=total_ne,
        reg_pct=global_reg_pct,
        tvv_count=tvv_count,
        branches=branches,
        by_sale=by_sale,
        top_priority_leads=top_priority,
        conversion_by_assignee=conversion_by_assignee,
        status_breakdown=status_breakdown,
    )
