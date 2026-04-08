"""Call-status labels (Excel/CRM) and mapping to workflow status."""

from __future__ import annotations

import re
from typing import Optional

from app.core.constants import (
    LEAD_STATUS_ACTIVE,
    LEAD_STATUS_CLOSED,
    LEAD_STATUS_CONTACTING,
    LEAD_STATUS_NEW,
)

# Order matches Excel export / UI
CALL_STATUS_LABELS_VN: tuple[str, ...] = (
    "Chưa gọi",
    "Đã gọi - Không nghe máy",
    "Đã gọi - Thuê bao",
    "Đã gọi - Nhầm máy",
    "Đã gọi - Bận",
    "Đã gọi - Hẹn gọi lại",
    "Đã gọi - Không quan tâm",
    "Đã gọi - Quan tâm",
    "Đã gọi - Tiềm năng",
    "Đã gọi - Đã chốt",
    "Đã gọi - Đã gửi mail",
    "Đã gọi - Đã gửi zalo",
    "Đã gọi - Đã gửi báo giá",
    "Đã gọi - Đã gửi hợp đồng",
    "Đã gọi - Đã thanh toán",
    "Đã gọi - Đã hoàn thành",
)

_EXTRA_CALL_KEYS = ("Tình trạng gọi điện", "Tình trạng cuộc gọi")


def norm_call_label(s: object) -> str:
    return re.sub(r"\s+", " ", str(s or "").strip()).casefold()


def lead_extra_call_status_label(extra: Optional[dict]) -> str:
    if not extra:
        return ""
    for k in _EXTRA_CALL_KEYS:
        v = extra.get(k)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def set_extra_call_status_labels(extra: dict, label: str) -> dict:
    out = dict(extra)
    t = label.strip()
    if not t:
        for k in _EXTRA_CALL_KEYS:
            out.pop(k, None)
        return out
    for k in _EXTRA_CALL_KEYS:
        out[k] = t
    return out


def filter_leads_by_contact_call_status_labels(rows: list, contact_call_statuses: Optional[list]) -> list:
    """Filter leads by call-status labels (matched after norm_call_label)."""
    if not contact_call_statuses:
        return rows
    allowed = {norm_call_label(x) for x in contact_call_statuses if str(x).strip()}
    if not allowed:
        return rows
    out = []
    for r in rows:
        ex = getattr(r, "extra", None)
        if norm_call_label(lead_extra_call_status_label(ex if isinstance(ex, dict) else None)) in allowed:
            out.append(r)
    return out


def internal_status_from_call_label(label: str) -> Optional[str]:
    """Map call-status label to suggested lead.status (exact or fuzzy)."""
    raw = str(label or "").strip()
    if not raw:
        return None
    n = norm_call_label(raw)

    if n == norm_call_label("Chưa gọi"):
        return LEAD_STATUS_NEW

    if any(
        x in n
        for x in (
            "không quan tâm",
            "đã chốt",
            "đã thanh toán",
            "đã hoàn thành",
        )
    ):
        return LEAD_STATUS_CLOSED

    if any(
        x in n
        for x in (
            "không nghe máy",
            "thuê bao",
            "nhầm máy",
            "bận",
            "hẹn gọi lại",
        )
    ):
        return LEAD_STATUS_CONTACTING

    if any(
        x in n
        for x in (
            "quan tâm",
            "tiềm năng",
            "gửi mail",
            "gửi zalo",
            "báo giá",
            "hợp đồng",
        )
    ):
        return LEAD_STATUS_ACTIVE

    return None
