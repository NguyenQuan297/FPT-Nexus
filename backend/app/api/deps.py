from collections.abc import AsyncGenerator
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db as get_db_session
from app.models.user import User
from app.services import auth_service, presence_service

security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


async def get_current_user(
    cred: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(cred.credentials)
        uid = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await auth_service.get_user_by_id(db, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    await presence_service.touch_online(user.id)
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


async def get_current_user_optional(
    cred: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not cred:
        return None
    try:
        payload = decode_token(cred.credentials)
        uid = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError, TypeError):
        return None
    user = await auth_service.get_user_by_id(db, uid)
    if not user or not user.is_active:
        return None
    return user
