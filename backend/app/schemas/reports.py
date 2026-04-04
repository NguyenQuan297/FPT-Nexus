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
    total_leads: int = Field(description="Leads in selected report period assigned to this assignee")
    overdue_leads: int = Field(description="Leads overdue by SLA in selected report period")
    sla_compliance_pct: float = Field(description="(total - overdue) / total * 100")


class ConversionRowOut(BaseModel):
    assignee: str
    total_leads: int
    reg_count: int
    nb_count: int
    ne_count: int


class MonthlyReportOut(BaseModel):
    year: int
    month: int
    total_leads_created: int
    overdue_leads: int = Field(description="Leads overdue by SLA in selected report period")
    sla_compliance_pct: float = Field(description="(total - overdue) / total * 100")
    by_sale: List[SaleMonthlySlice]
    top_priority_leads: List[PriorityLeadOut] = Field(
        default_factory=list,
        description="Business-friendly top priority overdue leads",
    )
    conversion_by_assignee: List[ConversionRowOut] = Field(default_factory=list)
