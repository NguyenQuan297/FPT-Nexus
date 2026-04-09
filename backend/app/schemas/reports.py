from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PriorityLeadOut(BaseModel):
    id: UUID
    name: str
    phone: Optional[str] = None
    assignee: Optional[str] = None
    status: str
    created_at: str
    last_contact_at: Optional[str] = None


class SaleMonthlySlice(BaseModel):
    assignee: str
    branch: str = "Cơ sở khác"
    total_leads: int = Field(description="Leads in selected report period assigned to this assignee")
    overdue_leads: int = Field(description="Leads overdue by SLA in selected report period")
    sla_compliance_pct: float = Field(description="(total - overdue) / total * 100")


class ConversionRowOut(BaseModel):
    assignee: str
    branch: str = "Cơ sở khác"
    total_leads: int
    reg_count: int
    nb_count: int
    ne_count: int
    reg_pct: float = 0.0


class BranchSummary(BaseModel):
    name: str
    total_leads: int = 0
    total_reg: int = 0
    total_nb: int = 0
    total_ne: int = 0
    tvv_count: int = 0
    reg_pct: float = 0.0


class StatusBreakdownRow(BaseModel):
    assignee: str
    branch: str = "Cơ sở khác"
    quan_tam: int = 0
    suy_nghi_them: int = 0
    tiem_nang: int = 0
    khong_quan_tam: int = 0
    khong_phu_hop: int = 0
    chua_cap_nhat: int = 0


class MonthlyReportOut(BaseModel):
    year: int
    month: int
    total_leads_created: int
    overdue_leads: int = Field(description="Leads overdue by SLA in selected report period")
    sla_compliance_pct: float = Field(description="(total - overdue) / total * 100")
    total_reg: int = 0
    total_nb: int = 0
    total_ne: int = 0
    reg_pct: float = 0.0
    tvv_count: int = 0
    branches: List[BranchSummary] = Field(default_factory=list)
    by_sale: List[SaleMonthlySlice]
    top_priority_leads: List[PriorityLeadOut] = Field(
        default_factory=list,
        description="Business-friendly top priority overdue leads",
    )
    conversion_by_assignee: List[ConversionRowOut] = Field(default_factory=list)
    status_breakdown: List[StatusBreakdownRow] = Field(default_factory=list)
