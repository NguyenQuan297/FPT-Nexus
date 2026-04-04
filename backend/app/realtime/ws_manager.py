from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List

import redis.asyncio as redis
from fastapi import WebSocket

from app.core.config import settings
from app.realtime.events import CHANNEL

log = logging.getLogger(__name__)


@dataclass
class WsClient:
    websocket: WebSocket
    user_id: str
    username: str
    role: str


class RealtimeWsManager:
    def __init__(self) -> None:
        self._clients: List[WsClient] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, *, user_id: str, username: str, role: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._clients.append(
                WsClient(
                    websocket=websocket,
                    user_id=user_id,
                    username=username,
                    role=role,
                )
            )

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients = [c for c in self._clients if c.websocket is not websocket]

    async def _send_safe(self, ws: WebSocket, event: Dict[str, Any]) -> bool:
        try:
            await ws.send_json(event)
            return True
        except Exception:
            return False

    async def broadcast_event(self, event: Dict[str, Any]) -> None:
        payload = event.get("payload") or {}
        assignee = (payload.get("assigned_to") or "").strip()
        target_user_id = str(payload.get("user_id") or "")
        survivors: List[WsClient] = []
        async with self._lock:
            clients = list(self._clients)
        for c in clients:
            allowed = c.role == "admin"
            if not allowed and c.role == "sale":
                allowed = assignee == c.username or target_user_id == c.user_id
            if not allowed:
                survivors.append(c)
                continue
            ok = await self._send_safe(c.websocket, event)
            if ok:
                survivors.append(c)
        async with self._lock:
            self._clients = survivors


ws_manager = RealtimeWsManager()


async def redis_event_fanout_loop(stop: asyncio.Event) -> None:
    while not stop.is_set():
        pubsub = None
        try:
            r = redis.from_url(settings.redis_url, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL)
            log.info("Realtime fanout subscribed to channel %s", CHANNEL)
            while not stop.is_set():
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if not msg or msg.get("type") != "message":
                    await asyncio.sleep(0.05)
                    continue
                raw = msg.get("data")
                if not raw:
                    continue
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                await ws_manager.broadcast_event(event)
        except Exception as e:
            log.warning("Realtime fanout loop reconnecting: %s", e)
            await asyncio.sleep(2.0)
        finally:
            if pubsub is not None:
                try:
                    await pubsub.unsubscribe(CHANNEL)
                    await pubsub.close()
                except Exception:
                    pass

