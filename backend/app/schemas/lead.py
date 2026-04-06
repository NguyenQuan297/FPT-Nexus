from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.constants import LEGACY_STATUS_MAP


class LeadOut(BaseModel):
    id: UUID
    external_id: Optional[str]
    name: Optional[str]
    phone: Optional[str]
    phone_normalized: Optional[str]
    assigned_to: Optional[str]
    #: Tên người phụ trách như Excel / hiển thị; khác username đăng nhập khi đã gộp hoặc gán sale
    assigned_to_display: Optional[str] = None
    status: str
    source: Optional[str]
    branch: Optional[str]
    created_at: datetime
    contacted_at: Optional[datetime]
    last_contact_at: Optional[datetime]
    notes: Optional[str]
    extra: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _assigned_to_display(self):
        extra = self.extra if isinstance(self.extra, dict) else {}
        label = (extra.get("assignee_display_label") or "").strip()
        disp = label if label else self.assigned_to
        return self.model_copy(update={"assigned_to_display": disp})

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
    #: Thêm dòng trao đổi (có timestamp + user); không ghi đè toàn bộ notes
    append_note: Optional[str] = Field(default=None, max_length=4000)
    mark_contacted: bool = False
    last_contact_at: Optional[datetime] = None


class BulkAssignBody(BaseModel):
    lead_ids: List[UUID] = Field(min_length=1, max_length=500)
    username: str = Field(min_length=1, max_length=128)


class LeadFilterBody(BaseModel):
    assigned_to: Optional[str] = None
    phone: Optional[str] = None
    overdue_only: bool = False
    statuses: List[str] = Field(default_factory=list)
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    uncontacted_only: bool = False


class BulkActionBody(BaseModel):
    lead_ids: List[UUID] = Field(default_factory=list, max_length=50000)
    apply_filtered: bool = False
    filters: Optional[LeadFilterBody] = None
    action: str = Field(
        description=(
            "assign_to_user | auto_assign_round_robin | auto_assign_least_workload | "
            "status_new_to_contacting | status_contacting_to_da_nghe_may | "
            "mark_contacted | update_interest | mark_can_delete | detect_duplicates | "
            "detect_bad_phone | set_follow_up"
        )
    )
    username: Optional[str] = None
    only_overdue: bool = False
    interest_level: Optional[str] = None
    follow_up_at: Optional[datetime] = None


class BulkActionOut(BaseModel):
    total_selected: int
    affected: int
    skipped: int
    message: str


class DashboardStats(BaseModel):
    total_leads: int
    uncontacted: int
    active_leads: int
    contacting: int
    overdue: int
    at_risk: int = 0
    late: int
    conversion_reg_pct: float = 0.0
    contacted_today: int = 0
    daily_misses_today: Optional[int] = Field(
        default=None,
        description="Admin only: SUM(miss_count) in daily_miss_stats for UTC date today",
    )


class TrendPoint(BaseModel):
    day: str
    value: int


class RateTrendPoint(BaseModel):
    day: str
    value: float


class LeadQueryResponse(BaseModel):
    items: List[LeadOut]
    total: int
    page: int
    limit: int
    stats: DashboardStats
    trend_7d: List[TrendPoint] = Field(default_factory=list)
    contact_rate_7d: List[RateTrendPoint] = Field(default_factory=list)
    conversion_rate_7d: List[RateTrendPoint] = Field(default_factory=list)


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
