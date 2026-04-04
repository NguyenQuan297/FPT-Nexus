from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

import boto3

from app.core.config import settings


def ensure_upload_dir() -> Path:
    p = Path(settings.upload_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def save_upload_local(filename: str, data: bytes) -> str:
    ensure_upload_dir()
    safe = f"{uuid.uuid4().hex}_{filename}"
    path = Path(settings.upload_dir) / safe
    path.write_bytes(data)
    return str(path)


def save_upload_s3_if_configured(filename: str, data: bytes) -> Optional[str]:
    if not settings.s3_bucket or not settings.aws_access_key_id:
        return None
    key = f"uploads/{uuid.uuid4().hex}_{filename}"
    client = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    client.put_object(Bucket=settings.s3_bucket, Key=key, Body=data)
    return f"s3://{settings.s3_bucket}/{key}"


def persist_uploaded_file(filename: str, data: bytes) -> str:
    s3_uri = save_upload_s3_if_configured(filename, data)
    if s3_uri:
        return s3_uri
    return save_upload_local(filename, data)
