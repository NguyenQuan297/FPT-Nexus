from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import require_admin
from app.models.user import User
from app.services import excel_sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/latest")
async def latest_sync_meta(_: User = Depends(require_admin)):
    return await excel_sync_service.get_latest_meta()


@router.post("/run")
async def run_sync_now(_: User = Depends(require_admin)):
    return await excel_sync_service.generate_latest_excel(force=True, min_interval_seconds=0)


@router.post("/template")
async def upload_sync_template(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
):
    """Store the original Excel as the sync export template (does not import rows)."""
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="File rỗng")
    await excel_sync_service.register_sync_template_upload(file.filename or "template.xlsx", raw)
    return await excel_sync_service.generate_latest_excel(force=True, min_interval_seconds=0)


@router.get("/latest/download")
async def download_latest(_: User = Depends(require_admin)):
    meta = await excel_sync_service.get_latest_meta()
    p = Path(meta.get("path") or "")
    if not p.exists():
        raise HTTPException(status_code=404, detail="No synced file yet")
    return FileResponse(path=str(p), filename=meta.get("filename") or "leads_latest.xlsx")

