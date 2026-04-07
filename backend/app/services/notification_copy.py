"""Văn bản thông báo Telegram / admin — tiếng Việt, dễ đọc (không UUID, không key kỹ thuật)."""

from __future__ import annotations

from typing import Optional

from app.models.lead import Lead
from app.schemas.lead import LeadUpdateBody

STATUS_VI = {
    "new": "Mới",
    "contacting": "Đang liên hệ",
    "active": "Đã liên hệ",
    "late": "Quá hạn (chưa gọi)",
    "closed": "Đã đóng",
}


def status_vi(code: str) -> str:
    return STATUS_VI.get(code, code)


def lead_who(lead: Lead) -> str:
    """Tên + SĐT để người đọc nhận ra khách."""
    name = (lead.name or "").strip()
    phone = (lead.phone or "").strip()
    bits = []
    if name:
        bits.append(name)
    if phone:
        bits.append(f"SĐT {phone}")
    if bits:
        return " · ".join(bits)
    return "khách (chưa có tên và SĐT trên hệ thống)"


def lead_assignee_display(lead: Lead) -> str:
    extra = lead.extra if isinstance(lead.extra, dict) else {}
    return (extra.get("assignee_display_label") or "").strip() or (lead.assigned_to or "—")


def telegram_text_assign_lead(actor_username: str, assignee: str, lead: Lead) -> str:
    return (
        "🔔 Gán người phụ trách\n"
        f"{actor_username} đã gán khách {lead_who(lead)} cho sale «{assignee}»."
    )


def telegram_text_bulk_assign(actor_username: str, n: int, assignee: str) -> str:
    return (
        "🔔 Gán hàng loạt\n"
        f"{actor_username} đã gán {n} khách cho sale «{assignee}»."
    )


def telegram_text_update_lead(
    actor_username: str,
    actor_display_name: Optional[str],
    lead: Lead,
    old_status: str,
    body: LeadUpdateBody,
) -> str:
    who = lead_who(lead)
    new_status = lead.status
    actor_label = (actor_display_name or "").strip() or actor_username
    assignee_line = lead_assignee_display(lead)
    lines = [
        "🔔 Sale cập nhật lead",
        f"Khách: {who}",
        f"Nguồn: {(lead.source or '—').strip()} · Chi nhánh: {(lead.branch or '—').strip()}",
        f"Người phụ trách (hiển thị): {assignee_line}",
        f"Sale: {actor_label} (@{actor_username})",
    ]

    status_changed = old_status != new_status
    if status_changed:
        lines.append(
            f"Trạng thái: «{status_vi(old_status)}» → «{status_vi(new_status)}»"
        )
    if body.mark_contacted:
        lines.append("Đã đánh dấu đã liên hệ / có tiếp xúc.")

    note_s = str(body.append_note).strip() if body.append_note else ""
    if note_s:
        cap = 900
        trimmed = note_s[:cap]
        suffix = "…" if len(note_s) > cap else ""
        lines.append(f"Ghi chú mới (trao đổi): «{trimmed}{suffix}»")

    if body.notes is not None and not note_s:
        lines.append("Đã cập nhật nội dung ghi chú đầy đủ.")

    if body.contact_call_status is not None:
        ccs = (body.contact_call_status or "").strip()
        if ccs:
            lines.append(f"Tình trạng gọi điện → «{ccs}»")
        else:
            lines.append("Đã xóa nhãn tình trạng gọi điện trên lead.")

    return "\n".join(lines)


def sale_lead_update_should_notify(body: LeadUpdateBody) -> bool:
    """Có thay đổi thực sự cần báo admin (tránh PATCH rỗng)."""
    if body.append_note and str(body.append_note).strip():
        return True
    if body.notes is not None:
        return True
    if body.status is not None:
        return True
    if body.mark_contacted:
        return True
    if body.last_contact_at is not None:
        return True
    if body.contact_call_status is not None:
        return True
    return False


BULK_ACTION_HEADLINE_VI: dict[str, str] = {
    "assign_to_user": "Gán toàn bộ cho một sale",
    "auto_assign_round_robin": "Tự động gán luân phiên cho các sale",
    "auto_assign_least_workload": "Tự động gán theo sale ít lead nhất",
    "status_new_to_contacting": "Chuyển lead Mới → Đang liên hệ",
    "status_contacting_to_da_nghe_may": "Chuyển Đang liên hệ → Đã nghe máy",
    "mark_contacted": "Đánh dấu đã liên hệ",
    "update_interest": "Cập nhật mức độ quan tâm",
    "mark_can_delete": "Đánh dấu lead cần xóa",
    "detect_duplicates": "Quét trùng SĐT",
    "detect_bad_phone": "Quét số điện thoại bất thường",
    "set_follow_up": "Đặt lịch chăm sóc lại",
}


def telegram_text_bulk_action(
    actor_username: str,
    action: str,
    affected: int,
    total: int,
    skipped: int,
) -> str:
    headline = BULK_ACTION_HEADLINE_VI.get(action, "Thao tác hàng loạt")
    lines = [
        "🔔 Thao tác hàng loạt",
        f"{actor_username} vừa chạy: {headline}.",
        f"Đã áp dụng cho {affected} khách (trong {total} khách đã chọn).",
    ]
    if skipped:
        lines.append(f"{skipped} khách bị bỏ qua (không đủ điều kiện với thao tác này).")
    return "\n".join(lines)


def telegram_text_upload_excel(username: str, filename: str, queued_rows: int) -> str:
    return (
        "🔔 Tải file Excel\n"
        f"{username} vừa tải lên file «{filename}».\n"
        f"Đã đưa {queued_rows} dòng vào hàng đợi xử lý."
    )


def in_app_text_upload_excel_for_sales(admin_username: str, filename: str, queued_rows: int) -> str:
    """Thông báo trong app (sale) khi admin tải Excel — khác bản Telegram nhưng cùng nội dung chính."""
    return (
        f"Quản trị viên «{admin_username}» vừa tải lên file «{filename}».\n"
        f"Đã đưa {queued_rows} dòng vào hàng đợi xử lý."
    )


def sla_lead_one_line(lead: Lead) -> str:
    """Một dòng mô tả lead cho cảnh báo SLA (không UUID)."""
    return lead_who(lead)
