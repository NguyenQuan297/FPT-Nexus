export function renderEventText(evt) {
  const t = evt?.type || "event";
  const p = evt?.payload || {};
  if (t.startsWith("lead.")) return `Cập nhật lead: ${p.name || p.lead_id || "-"}`;
  if (t === "notification.created") {
    const title = (p.title || "").trim();
    const preview = (p.body || "").trim().split("\n")[0];
    if (title && preview) return `${title}: ${preview.slice(0, 120)}${preview.length > 120 ? "…" : ""}`;
    if (title) return title;
    return "Có thông báo mới từ sale";
  }
  if (t.startsWith("notification.")) return p.title ? `Thông báo: ${p.title}` : "Có thông báo mới";
  if (t === "excel_sync.updated") return `Đã đồng bộ Excel (${p.row_count || 0} dòng)`;
  return t;
}

export function statusLabel(status) {
  const map = {
    new: "Mới",
    contacting: "Đang liên hệ",
    active: "Đã liên hệ",
    late: "Trễ hạn",
    closed: "Đóng",
  };
  return map[status] || status || "-";
}

/** Call-status label from extra fields (not workflow status). */
export function callStatusFromLead(lead) {
  const ex = lead?.extra;
  if (!ex || typeof ex !== "object") return "";
  const a = ex["Tình trạng gọi điện"] ?? ex["Tình trạng cuộc gọi"];
  return a != null && String(a).trim() ? String(a).trim() : "";
}

export function formatDt(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function isClientOverdue(lead) {
  if (lead.status === "closed" || lead.last_contact_at) return false;
  const created = new Date(lead.created_at).getTime();
  return (Date.now() - created) / 3600000 > 16;
}

export function rowStyle(lead) {
  if (isClientOverdue(lead)) return { background: "#fff1f2", borderLeft: "4px solid #dc2626", cursor: "pointer" };
  if (!lead.last_contact_at && lead.status !== "closed") return { background: "#fffbeb", cursor: "pointer" };
  if (lead.last_contact_at) return { background: "#f0fdf4", cursor: "pointer" };
  return { cursor: "pointer" };
}
