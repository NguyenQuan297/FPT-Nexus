from __future__ import annotations

import asyncio
import json
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from uuid import UUID

from app.db.session import AsyncSessionLocal
from app.models.ingest_error import IngestError
from app.queue.redis_queue import blocking_pop_lead_row, publish_to_dlq
from app.services import cache_service
from app.services import excel_sync_service
from app.services import lead_service

log = logging.getLogger(__name__)


async def lead_worker_loop(stop: asyncio.Event) -> None:
    """Consume Redis queue and persist leads via service + repository."""
    while not stop.is_set():
        try:
            data = await blocking_pop_lead_row(timeout_seconds=5)
        except OSError as e:
            log.warning("Queue pop failed: %s", e)
            await asyncio.sleep(2)
            continue
        if data is None:
            continue
        row = data["row"]
        batch_id_raw = data.get("batch_id")
        try:
            async with AsyncSessionLocal() as db:
                await lead_service.merge_ingested_row(db, row)
                await db.commit()
            await cache_service.cache_delete("dash:")
            await excel_sync_service.generate_latest_excel()
        except Exception as e:
            log.exception("Failed to persist lead from queue batch=%s", batch_id_raw)
            bid: Optional[UUID] = None
            if batch_id_raw:
                try:
                    bid = UUID(str(batch_id_raw))
                except ValueError:
                    bid = None
            async with AsyncSessionLocal() as db:
                ie = IngestError(
                    batch_id=bid,
                    payload=_payload_safe(row),
                    error_message=str(e)[:2000],
                )
                db.add(ie)
                await db.commit()
            await publish_to_dlq(
                {"batch_id": batch_id_raw, "row": row, "error": str(e)[:500]}
            )


def _payload_safe(row: Dict[str, Any]) -> Dict[str, Any]:
    """JSONB requires JSON-serializable values (UUID/datetime must not be raw objects)."""

    def _default(o: Any) -> Any:
        if o is None:
            return None
        if isinstance(o, UUID):
            return str(o)
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, bytes):
            return o.decode("utf-8", errors="replace")
        if hasattr(o, "item") and callable(getattr(o, "item", None)):
            try:
                return o.item()
            except Exception:
                pass
        return str(o)

    try:
        return json.loads(json.dumps(row, default=_default))
    except (TypeError, ValueError):
        out: Dict[str, Any] = {}
        for k, v in row.items():
            try:
                out[str(k)] = json.loads(json.dumps({"_": v}, default=_default))["_"]
            except Exception:
                out[str(k)] = str(v)[:2000]
        return out
