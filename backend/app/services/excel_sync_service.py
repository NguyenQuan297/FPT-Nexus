from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable

from openpyxl import Workbook, load_workbook
from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.import_batch import ImportBatch
from app.models.lead import Lead
from app.realtime.events import publish_event

log = logging.getLogger(__name__)

_lock = asyncio.Lock()
_last_run_ts: float = 0.0


def _sync_dir() -> Path:
    p = Path(settings.upload_dir) / "synced"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _meta_path() -> Path:
    return _sync_dir() / "latest_sync.json"


def _template_info_path() -> Path:
    return _sync_dir() / "latest_template.json"


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


async def register_sync_template_upload(filename: str, raw: bytes) -> Dict[str, Any]:
    """
    Persist the original uploaded Excel as the canonical template for sync export.
    Export job will patch this file in-place so layout/styles stay unchanged.
    """
    ext = Path(filename).suffix.lower() or ".xlsx"
    if ext not in {".xlsx", ".xlsm"}:
        ext = ".xlsx"
    target = _sync_dir() / f"latest_template{ext}"
    target.write_bytes(raw)
    info = {
        "status": "ready",
        "filename": filename,
        "template_path": str(target),
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    _template_info_path().write_text(json.dumps(info, ensure_ascii=True, indent=2), encoding="utf-8")
    return info


def _latest_template_path() -> Path | None:
    p = _template_info_path()
    if not p.exists():
        return None
    try:
        info = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    candidate = Path(str(info.get("template_path") or ""))
    if candidate.exists():
        return candidate
    return None


def _norm_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).lower()


def _phone_digits(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    text = re.sub(r"\.0$", "", text)
    digits = re.sub(r"\D", "", text)
    if len(digits) == 9:
        digits = "0" + digits
    return digits


def _status_for_excel(lead: Lead) -> str:
    if lead.status == "closed":
        return "Đóng"
    if lead.last_contact_at is not None or lead.status == "active":
        return "Đã liên hệ"
    if lead.status == "contacting":
        return "Đang liên hệ"
    if lead.status == "late":
        return "Trễ hạn"
    return "Chưa liên hệ"


def _resolve_template_path(uri: str | None) -> Path | None:
    if not uri or uri.startswith("s3://"):
        return None
    candidate = Path(uri)
    if candidate.exists():
        return candidate
    fallback = Path(settings.upload_dir) / candidate.name
    if fallback.exists():
        return fallback
    return None


def _pick_col(header_map: Dict[str, int], aliases: Iterable[str]) -> int | None:
    for alias in aliases:
        hit = header_map.get(_norm_text(alias))
        if hit is not None:
            return hit
    return None


def _find_header_row(ws) -> tuple[int, Dict[str, int]] | tuple[None, None]:
    for r in range(1, min(ws.max_row, 12) + 1):
        header_map: Dict[str, int] = {}
        for c in range(1, ws.max_column + 1):
            norm = _norm_text(ws.cell(row=r, column=c).value)
            if norm:
                header_map[norm] = c
        if not header_map:
            continue
        if any(
            key in header_map
            for key in (
                _norm_text("Mã KH"),
                _norm_text("Điện thoại phụ huynh"),
                _norm_text("Số điện thoại"),
                _norm_text("Tình trạng gọi điện"),
                _norm_text("Last contact at"),
            )
        ):
            return r, header_map
    return None, None


def _apply_updates_to_template(wb, rows: list[Lead]) -> tuple[int, int]:
    by_external: Dict[str, Lead] = {}
    by_phone: Dict[str, Lead] = {}
    for lead in rows:
        ext = (lead.external_id or "").strip()
        if ext:
            by_external[ext] = lead
        phone = _phone_digits(lead.phone_normalized or lead.phone)
        if phone:
            by_phone[phone] = lead

    updated_cells = 0
    matched_rows = 0
    for ws in wb.worksheets:
        header_row, header_map = _find_header_row(ws)
        if not header_row or not header_map:
            continue

        col_external = _pick_col(header_map, ["Mã KH", "Mã khách hàng", "Mã khách hàng CRM", "external_id"])
        col_phone = _pick_col(header_map, ["Điện thoại phụ huynh", "Số điện thoại", "Điện thoại", "Phone"])
        col_status = _pick_col(header_map, ["Tình trạng gọi điện", "Trạng thái gọi", "Status"])
        if not (col_external or col_phone):
            continue

        for r in range(header_row + 1, ws.max_row + 1):
            lead = None
            if col_external:
                ext = str(ws.cell(row=r, column=col_external).value or "").strip()
                if ext:
                    lead = by_external.get(ext)
            if lead is None and col_phone:
                phone = _phone_digits(ws.cell(row=r, column=col_phone).value)
                if phone:
                    lead = by_phone.get(phone)
            if lead is None:
                continue

            matched_rows += 1

            if col_status:
                status_value = _status_for_excel(lead)
                cell = ws.cell(row=r, column=col_status)
                if str(cell.value or "").strip() != status_value:
                    cell.value = status_value
                    updated_cells += 1

    return updated_cells, matched_rows


def _build_snapshot_workbook(rows: list[Lead]):
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
    return wb


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
            latest_batch = (
                (await db.execute(select(ImportBatch).order_by(ImportBatch.created_at.desc()).limit(1)))
                .scalars()
                .first()
            )

        source_template = _latest_template_path()
        if source_template is None:
            source_template = _resolve_template_path(latest_batch.storage_uri if latest_batch else None)
        if source_template is not None:
            try:
                wb = load_workbook(source_template)
                updated_cells, matched_rows = _apply_updates_to_template(wb, rows)
                mode = "template_patch"
            except Exception as e:
                log.warning("Template patch failed, fallback snapshot mode: %s", e)
                wb = _build_snapshot_workbook(rows)
                updated_cells, matched_rows = 0, 0
                mode = "snapshot"
        else:
            wb = _build_snapshot_workbook(rows)
            updated_cells, matched_rows = 0, 0
            mode = "snapshot"

        out = _file_path()
        wb.save(out)
        stamp = datetime.now(timezone.utc).isoformat()
        meta = {
            "status": "synced",
            "filename": out.name,
            "path": str(out),
            "last_updated": stamp,
            "row_count": len(rows),
            "mode": mode,
            "template_source": str(source_template) if source_template else None,
            "matched_rows": matched_rows,
            "updated_cells": updated_cells,
        }
        await _write_meta(meta)
        _last_run_ts = now_ts
        await publish_event("excel_sync.updated", meta)
        log.info(
            "Excel sync generated: rows=%s mode=%s matched=%s updated_cells=%s -> %s",
            len(rows),
            mode,
            matched_rows,
            updated_cells,
            out,
        )
        return meta

