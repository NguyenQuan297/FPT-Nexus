"""Gắn nhãn hiển thị người phụ trách (Excel) cho LeadOut — tránh vòng import lead_service ↔ lead_query_service."""

from __future__ import annotations

import unicodedata
from typing import List

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.repositories.user_repository import UserRepository
from app.schemas.lead import LeadOut

user_repo = UserRepository()


def _lead_row_dict(lead: Lead) -> dict:
    return {c.key: getattr(lead, c.key) for c in sa_inspect(lead).mapper.column_attrs}


def normalize_text_for_match(v: object) -> str:
    s = str(v or "").strip().lower()
    s = "".join(
        ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn"
    )
    return " ".join(s.split())


async def build_username_display_map(
    db: AsyncSession, usernames: set[str]
) -> dict[str, str]:
    display_map: dict[str, str] = {}
    if not usernames:
        return display_map
    users = await user_repo.get_by_usernames(db, list(usernames))
    for u in users:
        display_map[u.username] = (u.display_name or "").strip() or u.username
    return display_map


def assignee_display_for_lead(lead: Lead, display_map: dict[str, str]) -> str:
    ex = lead.extra if isinstance(lead.extra, dict) else {}
    label = str(ex.get("assignee_display_label") or "").strip()
    if label:
        return label
    un = (lead.assigned_to or "").strip()
    if not un:
        return ""
    return display_map.get(un, un)


def assignee_matches_query(lead: Lead, query: str, display_map: dict[str, str]) -> bool:
    qn = normalize_text_for_match(query)
    if not qn:
        return True
    disp = assignee_display_for_lead(lead, display_map)
    raw = (lead.assigned_to or "").strip()
    return qn in normalize_text_for_match(disp) or qn in normalize_text_for_match(raw)


async def leads_to_lead_outs(db: AsyncSession, leads: List[Lead]) -> List[LeadOut]:
    if not leads:
        return []
    missing: set[str] = set()
    for L in leads:
        ex = L.extra if isinstance(L.extra, dict) else {}
        if ex.get("assignee_display_label"):
            continue
        u = (L.assigned_to or "").strip()
        if u:
            missing.add(u)
    display_map = await build_username_display_map(db, missing)
    outs: List[LeadOut] = []
    for L in leads:
        ex = dict(L.extra or {})
        if not ex.get("assignee_display_label"):
            un = (L.assigned_to or "").strip()
            if un and un in display_map:
                ex["assignee_display_label"] = display_map[un]
        d = _lead_row_dict(L)
        d["extra"] = ex
        outs.append(LeadOut.model_validate(d))
    return outs


async def lead_to_lead_out(db: AsyncSession, lead: Lead) -> LeadOut:
    outs = await leads_to_lead_outs(db, [lead])
    return outs[0]
