from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# bcrypt limits passwords to 72 bytes; passlib did the same implicitly
_BCRYPT_MAX = 72


def hash_password(plain: str) -> str:
    pw = plain.encode("utf-8")[:_BCRYPT_MAX]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8")[:_BCRYPT_MAX],
            hashed.encode("utf-8"),
        )
    except ValueError:
        return False


def create_access_token(
    subject: str, extra: Optional[dict[str, Any]] = None
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
    }
    if extra:
        to_encode.update(extra)
    return jwt.encode(
        to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )


def parse_user_id_from_token(token: str) -> UUID:
    payload = decode_token(token)
    sub = payload.get("sub")
    if not sub:
        raise JWTError("missing sub")
    return UUID(sub)
