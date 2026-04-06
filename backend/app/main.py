import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401 — register ORM metadata

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.db.base import Base
from app.db.schema_patch import (
    apply_postgres_lead_patches,
    apply_postgres_notification_pref_table,
    apply_postgres_user_display_name,
)
from app.db.session import AsyncSessionLocal, engine
from app.realtime.ws_manager import redis_event_fanout_loop
from app.workers.daily_miss_worker import schedule_daily_miss_job
from app.workers.lead_worker import lead_worker_loop
from app.workers.sla_worker import schedule_sla_job

setup_logging()
log = logging.getLogger(__name__)


async def _seed_admin_if_needed() -> None:
    if not settings.seed_admin_password:
        return
    from app.core.security import hash_password
    from app.repositories.user_repository import UserRepository

    uname = settings.seed_admin_username or "admin"
    async with AsyncSessionLocal() as db:
        r = UserRepository()
        existing = await r.get_by_username(db, uname)
        if existing:
            if settings.seed_admin_update_existing:
                existing.password_hash = hash_password(settings.seed_admin_password)
                await db.commit()
                log.info("Updated password for existing user '%s'", uname)
            return
        await r.create(
            db,
            uname,
            hash_password(settings.seed_admin_password),
            "admin",
        )
        await db.commit()
        log.info("Seeded admin user '%s'", uname)

scheduler = BackgroundScheduler()
_worker_stop: Optional[asyncio.Event] = None
_worker_task: Optional[asyncio.Task] = None
_rt_stop: Optional[asyncio.Event] = None
_rt_task: Optional[asyncio.Task] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_stop, _worker_task, _rt_stop, _rt_task
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await apply_postgres_lead_patches(conn)
        await apply_postgres_user_display_name(conn)
        await apply_postgres_notification_pref_table(conn)

    await _seed_admin_if_needed()

    _worker_stop = asyncio.Event()
    _worker_task = asyncio.create_task(lead_worker_loop(_worker_stop))
    log.info("Lead ingest worker started")
    _rt_stop = asyncio.Event()
    _rt_task = asyncio.create_task(redis_event_fanout_loop(_rt_stop))
    log.info("Realtime fanout worker started")

    scheduler.add_job(
        schedule_sla_job,
        "interval",
        minutes=settings.job_interval_minutes,
        id="sla_monitor",
        replace_existing=True,
    )
    scheduler.add_job(
        schedule_daily_miss_job,
        "cron",
        hour=0,
        minute=10,
        id="daily_miss_snapshot",
        replace_existing=True,
    )
    scheduler.start()
    log.info(
        "Scheduler: SLA every %s min; daily miss snapshot 00:10 UTC",
        settings.job_interval_minutes,
    )

    yield

    if _worker_stop:
        _worker_stop.set()
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
    if _rt_stop:
        _rt_stop.set()
    if _rt_task:
        _rt_task.cancel()
        try:
            await _rt_task
        except asyncio.CancelledError:
            pass
    scheduler.shutdown(wait=False)


app = FastAPI(title="Lead Management API", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
