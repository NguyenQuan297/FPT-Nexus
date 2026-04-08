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
    #: Exact Excel assignee string; reassign those leads to this user's username
    merge_leads_from_assignee: Optional[str] = Field(None, max_length=512)


class UserOut(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool
    is_online: bool = False
    #: Set on PATCH: count of leads reassigned from Excel label to username
    leads_reassigned_from_assignee: Optional[int] = None

    model_config = {"from_attributes": True}


class UserPerformanceOut(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    role: str
    is_active: bool
    is_online: bool = False
    leads: int
    sla_pct: float
    reg_pct: float
