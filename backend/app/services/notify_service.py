from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

log = logging.getLogger(__name__)

ChatIdParam = Union[str, int]


def _coerce_telegram_chat_id(chat_id: str) -> ChatIdParam:
    """Telegram accepts string or int; numeric private chats as int avoids edge cases."""
    s = (chat_id or "").strip()
    if s.isdigit():
        return int(s)
    if s.startswith("-") and s[1:].isdigit():
        return int(s)
    return s


def telegram_send_message_result(
    token: str, chat_id: str, text: str
) -> Tuple[bool, str]:
    """
    Call Bot API sendMessage. Telegram often returns HTTP 200 with JSON {"ok": false, ...}
    on failure — must check the "ok" field, not only HTTP status.
    """
    if not token or not chat_id:
        return False, "Thiếu TELEGRAM_BOT_TOKEN hoặc chat_id."
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    chat_param = _coerce_telegram_chat_id(chat_id)
    payload: Dict[str, Any] = {"chat_id": chat_param, "text": text[:4000]}
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(url, json=payload)
            try:
                data = r.json()
            except Exception:
                return False, f"Telegram trả không phải JSON (HTTP {r.status_code})."
            if data.get("ok") is True:
                return True, "Đã gửi tin nhắn (Telegram sendMessage ok)."
            desc = data.get("description") or str(data)
            code = data.get("error_code")
            log.warning("Telegram sendMessage rejected: %s", data)
            hint = ""
            low = str(desc).lower()
            if "unauthorized" in low or r.status_code == 401:
                hint = " Kiểm tra TELEGRAM_BOT_TOKEN có đúng bot @BotFather của bot bạn đang chat không."
            elif "chat not found" in low or "peer_id" in low:
                hint = " Chat chưa /start bot hoặc chat_id không khớp."
            elif "bot was blocked" in low:
                hint = " Bạn đã chặn bot — bỏ chặn trong Telegram."
            return False, f"Telegram từ chối ({code}): {desc}.{hint}"
    except Exception as e:
        log.warning("telegram send failed: %s", e)
        return False, f"Lỗi kết nối tới api.telegram.org: {e}"


def send_telegram_to_chat(token: str, chat_id: str, text: str) -> bool:
    """POST sendMessage — delivers plain text to the given Telegram chat_id."""
    ok, _ = telegram_send_message_result(token, chat_id, text)
    return ok


def send_telegram_sync(text: str) -> bool:
    return send_telegram_to_chat(
        settings.telegram_bot_token or "",
        settings.telegram_chat_id or "",
        text,
    )


def send_email_sync(subject: str, body: str) -> bool:
    if not all(
        [
            settings.smtp_host,
            settings.smtp_user,
            settings.smtp_password,
            settings.alert_email_from,
            settings.alert_email_to,
        ]
    ):
        return False
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.alert_email_from
    msg["To"] = settings.alert_email_to
    msg.set_content(body)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)
    return True


def _effective_telegram_chat(*, pref_telegram: Optional[str]) -> Optional[str]:
    if pref_telegram and pref_telegram.strip():
        return pref_telegram.strip()
    env = (settings.telegram_chat_id or "").strip()
    return env or None


def _deliver_admin_telegram(text: str, *, pref_telegram: Optional[str]) -> None:
    token = (settings.telegram_bot_token or "").strip()
    tg_chat = _effective_telegram_chat(pref_telegram=pref_telegram)
    if not token:
        log.debug("Telegram notify skipped (TELEGRAM_BOT_TOKEN not set)")
        return
    if not tg_chat:
        log.debug("Telegram notify skipped (no chat_id in Cài đặt or TELEGRAM_CHAT_ID)")
        return
    ok, detail = telegram_send_message_result(token, tg_chat, text)
    if not ok:
        log.warning("Telegram admin notify failed: %s", detail)


def _sla_text(lead_summary: str) -> str:
    return (
        f"⚠️ Có khách quá hạn SLA (>{settings.sla_hours} giờ, chưa liên hệ):\n{lead_summary}"
    )


def notify_sla_violation_sync(lead_summary: str) -> None:
    """Env-only SLA notify (email + TELEGRAM_CHAT_ID). Prefer async DB path when possible."""
    text = _sla_text(lead_summary)
    ok_tg = send_telegram_sync(text)
    try:
        ok_em = send_email_sync("SLA violation", text)
    except OSError as e:
        log.warning("email send failed: %s", e)
        ok_em = False
    if not ok_tg and not ok_em:
        log.warning("No notification channels configured; SLA alert: %s", text)


def _deliver_sla_telegram(text: str, tg_chats: List[str]) -> bool:
    token = (settings.telegram_bot_token or "").strip()
    ok = False
    for chat in tg_chats:
        if token and chat:
            ok = send_telegram_to_chat(token, chat, text) or ok
    if not tg_chats:
        ok = send_telegram_sync(text) or ok
    try:
        ok_em = send_email_sync("SLA violation", text)
    except OSError as e:
        log.warning("email send failed: %s", e)
        ok_em = False
    if not ok and not ok_em:
        log.warning("No notification channels configured; SLA alert: %s", text)
    return ok or ok_em


async def notify_sla_violation_async(db: AsyncSession, lead_summary: str) -> None:
    from app.repositories.notification_pref_repository import NotificationPrefRepository

    text = _sla_text(lead_summary)
    prefs = await NotificationPrefRepository().list_admin_prefs(db)
    tg_order: List[str] = []
    seen_tg: set[str] = set()
    for p in prefs:
        if p.telegram_chat_id and p.telegram_chat_id.strip():
            c = p.telegram_chat_id.strip()
            if c not in seen_tg:
                seen_tg.add(c)
                tg_order.append(c)
    await asyncio.to_thread(_deliver_sla_telegram, text, tg_order)


def notify_admin_action_sync(
    *,
    text: str,
    pref_telegram: Optional[str] = None,
) -> None:
    _deliver_admin_telegram(text.strip()[:4000], pref_telegram=pref_telegram)


async def _resolve_admin_telegram_chat_id_list() -> List[str]:
    env = (settings.telegram_chat_id or "").strip()
    out: List[str] = []
    seen: set[str] = set()
    if env:
        seen.add(env)
        out.append(env)
    try:
        from app.db.session import AsyncSessionLocal
        from app.repositories.notification_pref_repository import (
            NotificationPrefRepository,
        )

        async with AsyncSessionLocal() as db:
            prefs = await NotificationPrefRepository().list_admin_prefs(db)
            for p in prefs:
                c = (p.telegram_chat_id or "").strip()
                if c and c not in seen:
                    seen.add(c)
                    out.append(c)
    except Exception as e:
        log.warning("list admin telegram prefs failed: %s", e)
    return out


async def notify_admin_action_async(
    *,
    text: str,
    actor_user_id: Optional[UUID] = None,
) -> None:
    """
    Gửi đến mọi kênh admin: TELEGRAM_CHAT_ID trong .env (nếu có) và
    tất cả chat_id admin đã liên kết trong Cài đặt (DB). Không trùng.
    """
    _ = actor_user_id  # tương thích gọi cũ (assign/upload); định tuyến dùng env + prefs admin
    token = (settings.telegram_bot_token or "").strip()
    if not token:
        log.debug("Telegram notify skipped (TELEGRAM_BOT_TOKEN not set)")
        return
    chats = await _resolve_admin_telegram_chat_id_list()
    if not chats:
        log.debug(
            "Telegram notify skipped (chưa có TELEGRAM_CHAT_ID trong .env "
            "và chưa có admin nào liên kết Telegram trong Cài đặt)"
        )
        return
    body = text.strip()[:4000]
    for chat in chats:
        try:
            await asyncio.to_thread(
                notify_admin_action_sync,
                text=body,
                pref_telegram=chat,
            )
        except Exception as e:
            log.warning("notify_admin_action_async failed for chat %s: %s", chat, e)


async def try_test_telegram_for_user(actor_user_id: UUID) -> Tuple[bool, str]:
    """Gửi một tin test; trả về (thành công theo API Telegram, mô tả cho UI)."""
    token = (settings.telegram_bot_token or "").strip()
    pref_tg: Optional[str] = None
    try:
        from app.db.session import AsyncSessionLocal
        from app.repositories.notification_pref_repository import (
            NotificationPrefRepository,
        )

        async with AsyncSessionLocal() as db:
            row = await NotificationPrefRepository().get_by_user(db, actor_user_id)
            if row:
                pref_tg = row.telegram_chat_id
    except Exception as e:
        return False, f"Không đọc được cấu hình: {e}"
    chat = _effective_telegram_chat(pref_telegram=pref_tg)
    if not token:
        return (
            False,
            "Chưa đặt TELEGRAM_BOT_TOKEN trong .env trên server (token của đúng bot bạn đang chat).",
        )
    if not chat:
        return (
            False,
            "Chưa có chat_id — nhập trong Cài đặt hoặc TELEGRAM_CHAT_ID trong .env.",
        )
    body = (
        "✅ Kết nối thông báo OK.\n"
        "Từ giờ bạn sẽ nhận tin hệ thống tại chat này. "
        "Nếu không thấy tin thử khi bấm nút test, kiểm tra token bot trên server."
    )
    return telegram_send_message_result(token, chat, body)


async def notify_admins_in_app_async(
    db: AsyncSession,
    *,
    title: str,
    body: str,
) -> None:
    """
    Ghi thông báo trong app cho mọi tài khoản admin (độc lập với Telegram).
    """
    from app.repositories.notification_repository import NotificationRepository
    from app.repositories.user_repository import UserRepository

    t = (title or "Thông báo").strip()[:256]
    b = (body or "").strip()[:12000]
    if not b:
        return
    admins = await UserRepository().list_by_role(db, "admin")
    if not admins:
        return
    repo = NotificationRepository()
    for u in admins:
        await repo.create(db, u.id, t, b)


async def notify_sales_excel_upload_in_app_async(
    *,
    admin_username: str,
    filename: str,
    queued_rows: int,
) -> None:
    """
    Ghi thông báo trong app cho mọi tài khoản sale khi admin tải file Excel.
    Dùng session riêng sau khi upload handler đã commit batch.
    """
    from app.db.session import AsyncSessionLocal
    from app.repositories.notification_repository import NotificationRepository
    from app.repositories.user_repository import UserRepository
    from app.services import notification_copy

    title = "Admin tải file Excel"
    body = notification_copy.in_app_text_upload_excel_for_sales(
        admin_username, filename, queued_rows
    )
    t = (title or "").strip()[:256]
    b = (body or "").strip()[:12000]
    if not b:
        return
    async with AsyncSessionLocal() as db:
        sales = await UserRepository().list_by_role(db, "sale")
        if not sales:
            return
        repo = NotificationRepository()
        for u in sales:
            await repo.create(db, u.id, t, b)
        await db.commit()
