"""PostgreSQL: add columns missing from older DBs (create_all does not ALTER existing tables)."""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

log = logging.getLogger(__name__)

_PG_LEAD_ALTS = [
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(32)",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(64)",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS extra JSONB",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS sla_hours_at_ingest DOUBLE PRECISION",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS upload_batch_id UUID",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_by_user_id UUID",
]


async def apply_postgres_lead_patches(conn: AsyncConnection) -> None:
    """Best-effort ALTERs so ORM matches Lead model."""
    if conn.engine.dialect.name != "postgresql":
        return
    n_ok = 0
    for sql in _PG_LEAD_ALTS:
        try:
            await conn.execute(text(sql))
            n_ok += 1
        except Exception as e:
            log.error("schema patch failed: %s | %s", sql, e)
    if n_ok:
        log.info("PostgreSQL leads table: applied %s/%s column patches", n_ok, len(_PG_LEAD_ALTS))

