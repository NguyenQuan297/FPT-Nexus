from __future__ import annotations

import csv
import io
from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin
from app.models.user import User
from app.schemas.lead import (
    BulkAssignBody,
    DashboardStats,
    LeadAssignBody,
    LeadQueryResponse,
    LeadOut,
    LeadUpdateBody,
)
from app.services import cache_service
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/export")
async def export_leads_csv(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    rows = await lead_service.export_leads_csv_rows(db, user)
    buf = io.StringIO()
    w = csv.writer(buf)
    for r in rows:
        w.writerow(r)
    data = buf.getvalue()
    return StreamingResponse(
        iter([data]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="leads_export.csv"',
        },
    )


@router.post("/bulk-assign")
async def bulk_assign(
    body: BulkAssignBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    n = await lead_service.bulk_assign(db, body.lead_ids, body.username, user)
    await db.commit()
    await cache_service.cache_delete("dash:")
    return {"assigned": n}


@router.get("/query", response_model=LeadQueryResponse)
async def query_leads(
    assigned_to: Optional[str] = None,
    phone: Optional[str] = None,
    overdue_only: bool = False,
    statuses: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    status_list = [s.strip() for s in statuses.split(",")] if statuses else None
    return await lead_service.query_leads_page(
        db,
        current_user=user,
        assigned_to=assigned_to,
        phone_search=phone,
        overdue_only=overdue_only,
        statuses=status_list,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )


@router.get("", response_model=List[LeadOut])
async def list_leads(
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    phone: Optional[str] = None,
    overdue_only: bool = False,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await lead_service.list_leads(
        db,
        current_user=user,
        assigned_to=assigned_to,
        status=status,
        phone_search=phone,
        overdue_only=overdue_only,
        limit=limit,
        offset=offset,
    )


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    assigned_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cache_key = f"dash:stats:{user.id}:{assigned_to or 'all'}"
    cached = await cache_service.cache_get_json(cache_key)
    if cached is not None:
        try:
            return DashboardStats.model_validate(cached)
        except ValidationError:
            pass

    stats = await lead_service.get_dashboard_stats(
        db, current_user=user, assigned_to=assigned_to
    )
    await cache_service.cache_set_json(
        cache_key, stats.model_dump(mode="json"), ttl_seconds=60
    )
    return stats


@router.patch("/{lead_id}/assign", response_model=LeadOut)
async def assign_lead(
    lead_id: UUID,
    body: LeadAssignBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lead = await lead_service.assign_lead(db, lead_id, body.username, user)
    await db.commit()
    await cache_service.cache_delete("dash:")
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def patch_lead(
    lead_id: UUID,
    body: LeadUpdateBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    lead = await lead_service.update_lead_fields(db, lead_id, body, user)
    await db.commit()
    await cache_service.cache_delete("dash:")
    return lead


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = await lead_service.get_lead(db, lead_id, user)
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found")
    return row
