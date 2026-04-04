from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.reports import MonthlyReportOut
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/monthly", response_model=MonthlyReportOut)
async def monthly_report(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    worst_min_days: int = Query(31, ge=1, le=365),
    worst_max_days: int = Query(35, ge=1, le=365),
):
    return await report_service.monthly_report(
        db, year, month, worst_min_days=worst_min_days, worst_max_days=worst_max_days
    )


@router.get("/monthly/export")
async def monthly_report_export_csv(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    worst_min_days: int = Query(31, ge=1, le=365),
    worst_max_days: int = Query(35, ge=1, le=365),
):
    r = await report_service.monthly_report(
        db, year, month, worst_min_days=worst_min_days, worst_max_days=worst_max_days
    )
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "summary_year",
            "summary_month",
            "total_leads_created",
            "overdue_leads",
            "sla_compliance_pct",
        ]
    )
    w.writerow([r.year, r.month, r.total_leads_created, r.overdue_leads, r.sla_compliance_pct])
    w.writerow([])
    w.writerow(["priority_name", "priority_phone", "priority_assignee", "priority_status", "priority_created_at"])
    for lead in r.top_priority_leads:
        w.writerow([lead.name, lead.phone or "", lead.assignee or "", lead.status, lead.created_at])
    w.writerow([])
    w.writerow(["assignee", "total_leads", "overdue_leads", "sla_compliance_pct"])
    for row in r.by_sale:
        w.writerow([row.assignee, row.total_leads, row.overdue_leads, row.sla_compliance_pct])
    data = buf.getvalue()
    fn = f"monthly_report_{year}_{month:02d}.csv"
    return StreamingResponse(
        iter([data]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fn}"'},
    )
