from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from openpyxl import Workbook
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.lead import Lead
from app.realtime.events import publish_event

log = logging.getLogger(__name__)

_lock = asyncio.Lock()
_last_run_ts: float = 0.0


def _sync_dir() -> Path:
    from app.core.config import settings

    p = Path(settings.upload_dir) / "synced"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _meta_path() -> Path:
    return _sync_dir() / "latest_sync.json"


def _file_path() -> Path:
    return _sync_dir() / "leads_latest.xlsx"


async def get_latest_meta() -> Dict[str, Any]:
    mp = _meta_path()
    if not mp.exists():
        return {
            "status": "never_synced",
            "filename": None,
            "last_updated": None,
        }
    try:
        return json.loads(mp.read_text(encoding="utf-8"))
    except Exception:
        return {"status": "error", "filename": None, "last_updated": None}


async def _write_meta(meta: Dict[str, Any]) -> None:
    _meta_path().write_text(json.dumps(meta, ensure_ascii=True, indent=2), encoding="utf-8")


async def generate_latest_excel(*, force: bool = False, min_interval_seconds: int = 45) -> Dict[str, Any]:
    """
    Build an up-to-date Excel snapshot from DB.
    Debounced to avoid generating file for every single row event.
    """
    global _last_run_ts
    now_ts = asyncio.get_running_loop().time()
    if not force and now_ts - _last_run_ts < min_interval_seconds:
        return await get_latest_meta()

    async with _lock:
        now_ts = asyncio.get_running_loop().time()
        if not force and now_ts - _last_run_ts < min_interval_seconds:
            return await get_latest_meta()

        async with AsyncSessionLocal() as db:
            rows = list((await db.execute(select(Lead).order_by(Lead.created_at.desc()))).scalars().all())

        wb = Workbook()
        ws = wb.active
        ws.title = "Leads"
        ws.append(
            [
                "id",
                "created_at",
                "name",
                "phone",
                "phone_normalized",
                "status",
                "assigned_to",
                "last_contact_at",
                "notes",
                "source",
                "branch",
            ]
        )
        for L in rows:
            ws.append(
                [
                    str(L.id),
                    L.created_at.isoformat() if L.created_at else "",
                    L.name or "",
                    L.phone or "",
                    L.phone_normalized or "",
                    L.status or "",
                    L.assigned_to or "",
                    L.last_contact_at.isoformat() if L.last_contact_at else "",
                    (L.notes or "")[:5000],
                    L.source or "",
                    L.branch or "",
                ]
            )
        out = _file_path()
        wb.save(out)
        stamp = datetime.now(timezone.utc).isoformat()
        meta = {
            "status": "synced",
            "filename": out.name,
            "path": str(out),
            "last_updated": stamp,
            "row_count": len(rows),
        }
        await _write_meta(meta)
        _last_run_ts = now_ts
        await publish_event("excel_sync.updated", meta)
        log.info("Excel sync generated: %s rows -> %s", len(rows), out)
        return meta

