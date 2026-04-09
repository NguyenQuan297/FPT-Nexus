from fastapi import APIRouter

from app.api.v1 import (
    auth,
    leads,
    notifications,
    realtime,
    reports,
    settings,
    sync,
    system_ops,
    upload,
    users,
)

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(leads.router)
router.include_router(upload.router)
router.include_router(reports.router)
router.include_router(notifications.router)
router.include_router(realtime.router)
router.include_router(sync.router)
router.include_router(system_ops.router)
router.include_router(settings.router)
