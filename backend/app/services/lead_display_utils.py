"""Gắn nhãn hiển thị người phụ trách (Excel) cho LeadOut — tránh vòng import lead_service ↔ lead_query_service."""

from __future__ import annotations

from typing import List

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.repositories.user_repository import UserRepository
from app.schemas.lead import LeadOut

user_repo = UserRepository()


def _lead_row_dict(lead: Lead) -> dict:
    return {c.key: getattr(lead, c.key) for c in sa_inspect(lead).mapper.column_attrs}


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
    display_map: dict[str, str] = {}
    if missing:
        users = await user_repo.get_by_usernames(db, list(missing))
        for u in users:
            display_map[u.username] = (u.display_name or "").strip() or u.username
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
