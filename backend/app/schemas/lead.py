from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.constants import LEGACY_STATUS_MAP


class LeadOut(BaseModel):
    id: UUID
    external_id: Optional[str]
    name: Optional[str]
    phone: Optional[str]
    phone_normalized: Optional[str]
    assigned_to: Optional[str]
    status: str
    source: Optional[str]
    branch: Optional[str]
    created_at: datetime
    contacted_at: Optional[datetime]
    last_contact_at: Optional[datetime]
    notes: Optional[str]
    extra: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: str) -> str:
        if v is None or v == "":
            return "new"
        if isinstance(v, str) and v in LEGACY_STATUS_MAP:
            return LEGACY_STATUS_MAP[v]
        return v


class LeadAssignBody(BaseModel):
    username: str = Field(min_length=1, max_length=128)


class LeadUpdateBody(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    mark_contacted: bool = False
    last_contact_at: Optional[datetime] = None


class BulkAssignBody(BaseModel):
    lead_ids: List[UUID] = Field(min_length=1, max_length=500)
    username: str = Field(min_length=1, max_length=128)


class DashboardStats(BaseModel):
    total_leads: int
    uncontacted: int
    active_leads: int
    contacting: int
    overdue: int
    late: int
    contacted_today: int = 0
    daily_misses_today: Optional[int] = Field(
        default=None,
        description="Admin only: SUM(miss_count) in daily_miss_stats for UTC date today",
    )


class TrendPoint(BaseModel):
    day: str
    value: int


class LeadQueryResponse(BaseModel):
    items: List[LeadOut]
    total: int
    page: int
    limit: int
    stats: DashboardStats
    trend_7d: List[TrendPoint] = Field(default_factory=list)


class ColumnMapping(BaseModel):
    """Maps logical fields to Excel column headers (exact or substring match)."""

    external_id: Optional[str] = Field(default="Mã KH")
    name: Optional[str] = Field(default="Tên Học Sinh")
    phone: Optional[str] = Field(default="Điện thoại phụ huynh")
    phone_secondary: Optional[str] = Field(default="Điện thoại phụ huynh 2")
    created_at: Optional[str] = Field(default="Ngày tạo")
    assigned_to: Optional[str] = Field(default="Người phụ trách")
    contact_status: Optional[str] = Field(default="Tình trạng gọi điện")
    source: Optional[str] = Field(default="Nguồn khách hàng")
    branch: Optional[str] = Field(default="Cơ sở")
    notes: Optional[str] = Field(default="Ghi chú")
    last_contact_at: Optional[str] = Field(default="Last contact at")
