from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.services import data_reset_service

router = APIRouter(prefix="/system", tags=["system"])


@router.post("/reset-operational-data")
async def reset_operational_data(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await data_reset_service.reset_operational_data(db)

