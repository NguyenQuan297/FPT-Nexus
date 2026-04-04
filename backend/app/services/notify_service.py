from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)


def send_telegram_sync(text: str) -> bool:
    token = settings.telegram_bot_token
    chat = settings.telegram_chat_id
    if not token or not chat:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    with httpx.Client(timeout=30.0) as client:
        r = client.post(url, json={"chat_id": chat, "text": text[:4000]})
        return r.is_success


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


def notify_sla_violation_sync(lead_summary: str) -> None:
    text = f"[SLA] Lead overdue (> {settings.sla_hours}h): {lead_summary}"
    ok_tg = send_telegram_sync(text)
    try:
        ok_em = send_email_sync("SLA violation", text)
    except OSError as e:
        log.warning("email send failed: %s", e)
        ok_em = False
    if not ok_tg and not ok_em:
        log.warning("No notification channels configured; SLA alert: %s", text)
