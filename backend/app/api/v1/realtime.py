from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.security import decode_token
from app.db.session import AsyncSessionLocal
from app.repositories.user_repository import UserRepository
from app.realtime.ws_manager import ws_manager

router = APIRouter(prefix="/realtime", tags=["realtime"])
user_repo = UserRepository()


@router.websocket("/ws")
async def ws_events(websocket: WebSocket, token: str = Query("")):
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = decode_token(token)
        uid = UUID(str(payload.get("sub")))
    except (JWTError, ValueError, TypeError):
        await websocket.close(code=1008)
        return

    async with AsyncSessionLocal() as db:
        user = await user_repo.get_by_id(db, uid)
    if not user or not user.is_active:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(
        websocket,
        user_id=str(user.id),
        username=user.username,
        role=user.role,
    )
    await websocket.send_json(
        {
            "type": "system.connected",
            "payload": {"user_id": str(user.id), "username": user.username, "role": user.role},
        }
    )
    try:
        while True:
            msg = await websocket.receive_text()
            if msg.strip().lower() == "ping":
                await websocket.send_json({"type": "system.pong", "payload": {}})
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
        await websocket.close()

