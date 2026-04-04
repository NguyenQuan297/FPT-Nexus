from __future__ import annotations

import re
from typing import Any, Dict, Optional

from app.core.constants import LEGACY_STATUS_MAP, VALID_LEAD_STATUSES


def normalize_phone(raw: Optional[str]) -> Optional[str]:
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) < 8 or len(digits) > 15:
        return None
    return digits


def normalize_lead_row(row: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(row)
    for k in ("name", "assigned_to", "external_id"):
        if out.get(k) is not None and isinstance(out[k], str):
            out[k] = out[k].strip() or None

    if out.get("phone") is not None:
        out["phone"] = normalize_phone(str(out["phone"]))
    if out.get("phone_secondary") is not None:
        out["phone_secondary"] = normalize_phone(str(out["phone_secondary"]))

    if out.get("phone"):
        out["phone_normalized"] = out["phone"]

    st = out.get("status")
    if isinstance(st, str):
        st = st.strip().lower()
        if st in LEGACY_STATUS_MAP:
            st = LEGACY_STATUS_MAP[st]
        if st not in VALID_LEAD_STATUSES:
            st = "new"
        out["status"] = st

    return out
