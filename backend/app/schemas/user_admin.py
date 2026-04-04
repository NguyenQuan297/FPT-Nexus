from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=128)
    password: str = Field(min_length=6, max_length=256)
    role: Literal["admin", "sale"]


class UserUpdate(BaseModel):
    role: Optional[Literal["admin", "sale"]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=256)


class UserOut(BaseModel):
    id: UUID
    username: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}
