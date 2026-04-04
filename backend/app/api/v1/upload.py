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
from app.schemas.lead import ColumnMapping
from app.services import cache_service, data_reset_service, lead_service
from app.services.storage_service import persist_uploaded_file

log = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])


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
    return {
        "queued": queued,
        "batch_id": str(batch_id),
        "storage": storage_uri,
        "uploaded_by": user.username,
        "message": "Rows published to ingest queue; worker will persist to DB.",
    }
