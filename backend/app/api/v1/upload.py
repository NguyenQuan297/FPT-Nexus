from __future__ import annotations

import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.ingestion.excel_ingest import enqueue_parsed_rows, parse_excel_bytes
from app.models.import_batch import ImportBatch
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.lead import ColumnMapping
from app.services import (
    cache_service,
    data_reset_service,
    excel_sync_service,
    lead_service,
    notification_copy,
    notify_service,
)
from app.services.storage_service import persist_uploaded_file

log = logging.getLogger(__name__)
_user_repo = UserRepository()

router = APIRouter(prefix="/upload", tags=["upload"])


def _norm_ws(v: object) -> str:
    return " ".join(str(v or "").strip().split())


async def _map_excel_assignee_to_sale_username(
    db: AsyncSession, rows: list[dict]
) -> list[dict]:
    """
    If an Excel assignee label matches sale.display_name (whitespace-insensitive),
    store login username in assigned_to and keep original Excel label in extra.
    """
    users = await _user_repo.list_users(db)
    label_to_username = {
        _norm_ws(u.display_name): u.username
        for u in users
        if u.role == "sale" and (u.display_name or "").strip()
    }
    if not label_to_username:
        return rows

    for row in rows:
        raw_assignee = (row.get("assigned_to") or "").strip()
        if not raw_assignee:
            continue
        username = label_to_username.get(_norm_ws(raw_assignee))
        if not username:
            continue
        row["assigned_to"] = username
        extra = dict(row.get("extra") or {})
        extra["assignee_display_label"] = raw_assignee
        row["extra"] = extra
    return rows


@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    mapping_json: Optional[str] = Form(None),
    replace_existing: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    raw = await file.read()
    if not raw:
        return {"queued": 0, "message": "empty file"}

    mapping = ColumnMapping()
    if mapping_json:
        mapping = ColumnMapping.model_validate(json.loads(mapping_json))

    batch_id = uuid.uuid4()
    storage_uri = persist_uploaded_file(file.filename or "upload.xlsx", raw)

    rows = parse_excel_bytes(raw, mapping, batch_id=batch_id)
    if replace_existing and not rows:
        raise HTTPException(
            status_code=400,
            detail=(
                "File không có dòng dữ liệu hợp lệ nên hệ thống KHÔNG xóa dữ liệu cũ. "
                "Vui lòng kiểm tra lại cột mapping hoặc nội dung file Excel."
            ),
        )
    rows = await _map_excel_assignee_to_sale_username(db, rows)
    try:
        await excel_sync_service.register_sync_template_upload(
            file.filename or "upload.xlsx", raw
        )
    except Exception:
        log.exception("Could not register sync template from upload")
    if replace_existing:
        log.info("Upload by %s requested dataset replace before ingest", user.username)
        await data_reset_service.reset_operational_data(db)
        inserted = 0
        for row in rows:
            await lead_service.merge_ingested_row(db, row)
            inserted += 1
        queued = inserted
        await cache_service.cache_delete("dash:")
    else:
        try:
            queued = await enqueue_parsed_rows(batch_id, rows)
        except Exception as e:
            log.exception("Enqueue failed")
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cannot reach Redis — ingest queue is required. "
                    "Start Redis (e.g. localhost:6379) and ensure REDIS_URL in .env matches."
                ),
            ) from e

    batch = ImportBatch(
        id=batch_id,
        uploaded_by_user_id=user.id,
        filename=file.filename or "upload.xlsx",
        storage_uri=storage_uri,
        row_count_queued=queued,
    )
    db.add(batch)
    await db.commit()

    log.info(
        "Upload by %s: %s rows queued batch %s",
        user.username,
        queued,
        batch_id,
    )
    await notify_service.notify_admin_action_async(
        text=notification_copy.telegram_text_upload_excel(
            user.username, file.filename or "upload.xlsx", queued
        ),
        actor_user_id=user.id,
    )
    try:
        await notify_service.notify_sales_excel_upload_in_app_async(
            admin_username=user.username,
            filename=file.filename or "upload.xlsx",
            queued_rows=queued,
        )
    except Exception:
        log.exception("notify_sales_excel_upload_in_app_async failed")
    return {
        "queued": queued,
        "batch_id": str(batch_id),
        "storage": storage_uri,
        "uploaded_by": user.username,
        "message": "Rows published to ingest queue; worker will persist to DB.",
    }
