from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=128)
    password: str = Field(min_length=6, max_length=256)
    role: Literal["admin", "sale"]
    display_name: Optional[str] = Field(None, max_length=512)


class UserUpdate(BaseModel):
    role: Optional[Literal["admin", "sale"]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=256)
    display_name: Optional[str] = Field(None, max_length=512)
    #: Khớp chính xác chuỗi người phụ trách trong Excel (assigned_to); gán toàn bộ lead đó sang username của user này
    merge_leads_from_assignee: Optional[str] = Field(None, max_length=512)


class UserOut(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool
    #: Chỉ có khi PATCH user (số lead đã đổi assigned_to từ nhãn Excel sang username)
    leads_reassigned_from_assignee: Optional[int] = None

    model_config = {"from_attributes": True}


class UserPerformanceOut(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool
    leads: int
    sla_pct: float
    reg_pct: float
