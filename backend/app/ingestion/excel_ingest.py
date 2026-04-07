from __future__ import annotations

import io
import logging
import re
import unicodedata
import uuid
from datetime import datetime, timezone
from typing import Any, List

import pandas as pd
from dateutil import parser as date_parser

from app.core.call_status import internal_status_from_call_label
from app.core.config import settings
from app.core.constants import (
    LEAD_STATUS_ACTIVE,
    LEAD_STATUS_CLOSED,
    LEAD_STATUS_CONTACTING,
    LEAD_STATUS_NEW,
)
from app.queue.redis_queue import publish_lead_row
from app.schemas.lead import ColumnMapping

log = logging.getLogger(__name__)

MAX_ROWS = 50_000

COLUMN_ALIASES = {
    "external_id": ["Mã KH", "Mã khách", "Mã khách hàng", "Mã khách hàng CRM"],
    "name": ["Tên khách hàng", "Họ tên khách", "Họ và tên", "Họ tên", "Tên Học Sinh", "Tên học sinh", "Tên KH", "Name"],
    "phone": [
        "Số điện thoại khách",
        "Điện thoại phụ huynh",
        "Số điện thoại",
        "Điện thoại",
        "Phone",
        "SĐT",
        "SDT",
    ],
    "phone_secondary": ["Số điện thoại 2", "Phone 2", "Điện thoại phụ huynh 2"],
    "created_at": ["Ngày tạo", "Created date", "Created at", "Ngày nhập", "Ngày lead", "Lead date", "Date"],
    "assigned_to": ["Người phụ trách", "Assignee", "Assigned to"],
    "contact_status": [
        "Tình trạng cuộc gọi",
        "Tình trạng gọi điện",
        "Trạng thái gọi",
        "Status",
        "Kết quả gọi",
        "Call status",
    ],
    "source": ["Nguồn khách hàng", "Lead source", "Source", "Kênh", "Campaign source"],
    "branch": ["Khu vực", "Cơ sở", "Chi nhánh", "Branch", "Campus", "Center"],
    "notes": ["Ghi chú", "Trao đổi gần nhất", "Notes", "Note", "Nội dung trao đổi", "Comment"],
    "last_contact_at": ["Last contact at", "Lần liên hệ gần nhất", "Ngày liên hệ gần nhất"],
    "parent_name": ["Họ và tên phụ huynh", "Tên phụ huynh", "Phụ huynh"],
}

KEYWORD_HINTS: dict[str, list[str]] = {
    "external_id": ["ma", "khach", "crm", "customer", "id"],
    "name": ["ten", "hoc", "sinh", "khach", "name", "student"],
    "phone": ["dien", "thoai", "phone", "sdt", "so", "lien", "he"],
    "phone_secondary": ["phone2", "thoai2", "phu", "secondary", "alt"],
    "created_at": ["ngay", "tao", "created", "date", "lead", "createdat"],
    "assigned_to": ["phu", "trach", "assignee", "assigned", "owner", "sale"],
    "contact_status": ["tinh", "trang", "goi", "status", "call", "ket", "qua"],
    "source": ["nguon", "source", "campaign", "channel", "kenh"],
    "branch": ["co", "so", "chi", "nhanh", "branch", "campus", "center"],
    "notes": ["ghi", "chu", "note", "comment", "trao", "doi", "noi", "dung"],
    "last_contact_at": ["last", "contact", "ngay", "lien", "he", "gan", "nhat"],
    "parent_name": ["phu", "huynh", "parent"],
}


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).strip())


def _strip_accents(s: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn"
    )


def _norm_key(s: str) -> str:
    """
    Header normalization for fuzzy matching across "similar" Excel files:
    - remove accents
    - lower case
    - remove punctuation/special chars
    - collapse spaces
    """
    plain = _strip_accents(str(s or "").strip()).lower()
    plain = re.sub(r"[^a-z0-9]+", " ", plain)
    return re.sub(r"\s+", " ", plain).strip()


def _contains_all_keywords(header_key: str, keywords: list[str]) -> bool:
    return all(k in header_key for k in keywords)


def _find_column(df: pd.DataFrame, header: str | None) -> str | None:
    if not header:
        return None
    h = _norm(header)
    hk = _norm_key(header)
    for c in df.columns:
        if _norm(str(c)) == h:
            return c
    for c in df.columns:
        if _norm_key(str(c)) == hk:
            return c
    for c in df.columns:
        if h.lower() in _norm(str(c)).lower():
            return c
    for c in df.columns:
        if hk and hk in _norm_key(str(c)):
            return c
    return None


def _find_column_any(df: pd.DataFrame, *headers: str | None) -> str | None:
    for h in headers:
        hit = _find_column(df, h)
        if hit:
            return hit
    return None


def _find_column_by_keywords(df: pd.DataFrame, field: str) -> str | None:
    """
    Generic fallback when aliases are not enough.
    Uses normalized keyword signatures to support "similar" templates.
    """
    hints = KEYWORD_HINTS.get(field) or []
    if not hints:
        return None
    # Try strong signatures first.
    strong_sets: dict[str, list[list[str]]] = {
        "phone": [["phone"], ["sdt"], ["dien", "thoai"]],
        "assigned_to": [["phu", "trach"], ["assignee"], ["assigned"]],
        "created_at": [["ngay", "tao"], ["created"], ["date"]],
        "contact_status": [["tinh", "trang", "goi"], ["call", "status"], ["status"]],
        "notes": [["ghi", "chu"], ["note"], ["comment"]],
    }
    for kws in strong_sets.get(field, []):
        for c in df.columns:
            if _contains_all_keywords(_norm_key(str(c)), kws):
                return c
    # Then looser "any keyword" scoring.
    best_col: str | None = None
    best_score = 0
    for c in df.columns:
        ck = _norm_key(str(c))
        score = sum(1 for h in hints if h in ck)
        if score > best_score:
            best_score = score
            best_col = c
    return best_col if best_score >= 2 else None


def _status_from_contact_cell(raw: Any) -> str:
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return LEAD_STATUS_NEW
    raw_s = str(raw).strip()
    inferred = internal_status_from_call_label(raw_s)
    if inferred is not None:
        return inferred
    t = _norm(str(raw)).lower()
    if any(
        x in t
        for x in (
            "chưa liên",
            "chua lien",
            "chưa gọi",
            "chua goi",
            "not contacted",
            "new",
            "chưa liên hệ",
        )
    ):
        return LEAD_STATUS_NEW
    if any(x in t for x in ("đóng", "dong", "closed", "hủy", "huy", "cancel")):
        return LEAD_STATUS_CLOSED
    if any(
        x in t
        for x in (
            "đã nghe",
            "da nghe",
            "đã liên",
            "đã gọi",
            "hen",
            "active",
            "contacted",
            "success",
        )
    ):
        return LEAD_STATUS_ACTIVE
    if any(
        x in t
        for x in ("đang", "gọi lại", "goi lai", "contacting", "progress", "follow")
    ):
        return LEAD_STATUS_CONTACTING
    if t:
        return LEAD_STATUS_CONTACTING
    return LEAD_STATUS_NEW


def _parse_created_at(val: Any) -> datetime:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return datetime.now(timezone.utc)
    if isinstance(val, datetime):
        dt = val
    elif hasattr(val, "to_pydatetime"):
        dt = val.to_pydatetime()
    else:
        s = str(val).strip()
        try:
            dt = date_parser.parse(s, dayfirst=True)
        except (ValueError, TypeError):
            dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_optional_dt(val: Any) -> datetime | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    if isinstance(val, str) and not val.strip():
        return None
    return _parse_created_at(val)


def _infer_last_contact_from_notes(note: str | None) -> datetime | None:
    if not note:
        return None
    m = re.search(r"\((\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2})\)", str(note))
    if not m:
        return None
    try:
        return _parse_created_at(m.group(1))
    except Exception:
        return None


def _cell_str(row: pd.Series, col: str | None) -> str | None:
    if not col or col not in row.index:
        return None
    v = row[col]
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def _cell_phone(row: pd.Series, col: str | None) -> str | None:
    if not col or col not in row.index:
        return None
    v = row[col]
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (int, float)) and not pd.isna(v):
        # Excel often stores phone numbers as numbers and strips leading zero.
        if float(v).is_integer():
            s = str(int(v))
        else:
            s = str(v).strip()
    else:
        s = str(v).strip()
    s = re.sub(r"\.0$", "", s)
    digits = re.sub(r"\D", "", s)
    if len(digits) == 9:
        digits = "0" + digits
    return digits or None


def parse_excel_bytes(
    data: bytes,
    mapping: ColumnMapping,
    batch_id: uuid.UUID | None = None,
) -> List[dict[str, Any]]:
    df = pd.read_excel(io.BytesIO(data), engine="openpyxl")
    df.columns = [_norm(str(c)) for c in df.columns]

    if len(df) > MAX_ROWS:
        raise ValueError(f"Too many rows (max {MAX_ROWS})")

    col_ext = _find_column_any(df, mapping.external_id, *COLUMN_ALIASES["external_id"])
    col_name = _find_column_any(df, mapping.name, *COLUMN_ALIASES["name"])
    col_phone = _find_column_any(df, mapping.phone, *COLUMN_ALIASES["phone"])
    col_phone2 = _find_column_any(df, mapping.phone_secondary, *COLUMN_ALIASES["phone_secondary"])
    col_created = _find_column_any(df, mapping.created_at, *COLUMN_ALIASES["created_at"])
    col_assign = _find_column_any(df, mapping.assigned_to, *COLUMN_ALIASES["assigned_to"])
    col_status = _find_column_any(df, mapping.contact_status, *COLUMN_ALIASES["contact_status"])
    col_source = _find_column_any(df, mapping.source, *COLUMN_ALIASES["source"])
    col_branch = _find_column_any(df, mapping.branch, *COLUMN_ALIASES["branch"])
    col_notes = _find_column_any(df, mapping.notes, *COLUMN_ALIASES["notes"])
    col_parent_name = _find_column_any(df, *COLUMN_ALIASES["parent_name"])
    col_last_contact = _find_column_any(
        df,
        getattr(mapping, "last_contact_at", None),
        *COLUMN_ALIASES["last_contact_at"],
    )

    # Fallback heuristics for similar Excel templates.
    col_ext = col_ext or _find_column_by_keywords(df, "external_id")
    col_name = col_name or _find_column_by_keywords(df, "name")
    col_phone = col_phone or _find_column_by_keywords(df, "phone")
    col_phone2 = col_phone2 or _find_column_by_keywords(df, "phone_secondary")
    col_created = col_created or _find_column_by_keywords(df, "created_at")
    col_assign = col_assign or _find_column_by_keywords(df, "assigned_to")
    col_status = col_status or _find_column_by_keywords(df, "contact_status")
    col_source = col_source or _find_column_by_keywords(df, "source")
    col_branch = col_branch or _find_column_by_keywords(df, "branch")
    col_notes = col_notes or _find_column_by_keywords(df, "notes")
    col_parent_name = col_parent_name or _find_column_by_keywords(df, "parent_name")
    col_last_contact = col_last_contact or _find_column_by_keywords(df, "last_contact_at")

    if not col_created:
        raise ValueError(
            f"Could not find created date column (expected like '{mapping.created_at}' or similar). "
            f"Columns: {list(df.columns)}"
        )

    rows: List[dict[str, Any]] = []
    for _, row in df.iterrows():
        external_id = _cell_str(row, col_ext)
        name = _cell_str(row, col_name)
        parent_name = _cell_str(row, col_parent_name)
        phone = _cell_phone(row, col_phone)
        phone_secondary = _cell_phone(row, col_phone2)
        if not phone and phone_secondary:
            phone = phone_secondary
        if not name and parent_name:
            name = parent_name
        assigned_to = _cell_str(row, col_assign)
        source = _cell_str(row, col_source)
        branch = _cell_str(row, col_branch)
        notes = _cell_str(row, col_notes)
        last_contact_at = _parse_optional_dt(row[col_last_contact]) if col_last_contact else None
        if last_contact_at is None:
            last_contact_at = _infer_last_contact_from_notes(notes)
        status = _status_from_contact_cell(row[col_status]) if col_status else "new"
        extra: dict[str, Any] = {}
        mapped_keys = {
            col_ext,
            col_name,
            col_phone,
            col_phone2,
            col_created,
            col_assign,
            col_status,
            col_source,
            col_branch,
            col_notes,
            col_parent_name,
            col_last_contact,
        }
        for c in df.columns:
            if c in mapped_keys or c is None:
                continue
            v = row[c]
            if v is not None and not (isinstance(v, float) and pd.isna(v)):
                extra[str(c)] = (
                    str(v) if not isinstance(v, (datetime,)) else v.isoformat()
                )

        raw_contact_status = _cell_str(row, col_status) if col_status else None
        if raw_contact_status:
            extra["Tình trạng gọi điện"] = raw_contact_status
            extra["Tình trạng cuộc gọi"] = raw_contact_status

        # Skip rows that are effectively empty; otherwise they become fake "new" leads
        # because created_at falls back to now().
        if not any(
            [
                external_id,
                name,
                phone,
                phone_secondary,
                assigned_to,
                notes,
                last_contact_at,
            ]
        ):
            continue

        created_at = _parse_created_at(row[col_created])

        rows.append(
            {
                "external_id": external_id,
                "name": name,
                "phone": phone,
                "phone_secondary": phone_secondary,
                "created_at": created_at,
                "assigned_to": assigned_to,
                "status": status,
                "source": source,
                "branch": branch,
                "notes": notes,
                "last_contact_at": last_contact_at,
                "extra": ({**extra, "Họ và tên phụ huynh": parent_name} if parent_name else extra) or None,
                "sla_hours_at_ingest": settings.sla_hours,
                "upload_batch_id": batch_id,
            }
        )
    return rows


async def enqueue_parsed_rows(batch_id: uuid.UUID, rows: List[dict[str, Any]]) -> int:
    """Push each parsed row to Redis for the lead worker (no direct DB writes)."""
    bid = str(batch_id)
    n = 0
    for row in rows:
        await publish_lead_row(bid, row)
        n += 1
    log.info("Enqueued %s lead rows for batch %s", n, bid)
    return n
