import { useEffect, useRef, useState } from "react";
import { CALL_STATUS_OPTIONS, LEADS_PAGE_SIZE } from "../../constants/leadConstants";
import { styles } from "../../styles/appStyles";
import { callStatusFromLead, formatDt, isClientOverdue } from "../../utils/leadUiHelpers";

/* ── Enrollment bucket from Excel extra fields ──── */
function enrollBucket(lead) {
  const ex = lead?.extra;
  if (!ex || typeof ex !== "object") return "NKR";
  const raw = String(ex["Tình trạng nhập học"] || ex["Trạng thái nhập học"] || "").trim().toLowerCase();
  if (!raw) return "NKR";
  if (raw.includes("reg") || raw.includes("đăng ký") || raw.includes("ghi danh")) return "REG";
  if (raw.includes("nb") || raw.includes("booking") || raw.includes("giữ chỗ")) return "NB";
  if (raw === "ne" || raw.includes("nhập học")) return "NE";
  return "NKR";
}

/* ── SVG Icons ─────────────────────────────────── */
const IconCall = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconChat = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconSmile = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

/* ── Source icons (SVG) ─────────────────────────── */
const SrcFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#1877F2" />
    <path d="M16.5 12.05h-2.7v7.95h-3.3v-7.95H8.7V9.3h1.8V7.5c0-1.5.71-3.5 3.5-3.5h2.6v2.7h-1.9c-.3 0-.7.15-.7.8V9.3h2.6l-.1 2.75z" fill="#fff" />
  </svg>
);
const SrcZalo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#0180C7" />
    <path d="M17.5 8.5C17.5 5.46 14.04 3 9.75 3S2 5.46 2 8.5c0 1.7 1.05 3.22 2.7 4.23l-.5 2.77 2.9-1.6c.85.2 1.73.3 2.65.3 4.29 0 7.75-2.46 7.75-5.7z" fill="#fff" />
    <text x="4.5" y="10.5" fill="#0180C7" fontSize="6" fontWeight="900" fontFamily="Arial,sans-serif">Zalo</text>
  </svg>
);
const SrcHotline = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#16a34a" />
    <path d="M6.6 10.8c0-3 2.4-5.4 5.4-5.4s5.4 2.4 5.4 5.4c0 2.2-1.3 4-3.2 4.9l.3 2.3-2.5-1.6c-3-.1-5.4-2.5-5.4-5.6z" fill="none" stroke="#fff" strokeWidth="1.5" />
    <path d="M9.5 10.5h5M9.5 13h3" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const SrcWebsite = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#6366f1" />
    <circle cx="12" cy="12" r="5.5" stroke="#fff" strokeWidth="1.5" fill="none" />
    <ellipse cx="12" cy="12" rx="2.5" ry="5.5" stroke="#fff" strokeWidth="1.2" fill="none" />
    <line x1="6.5" y1="12" x2="17.5" y2="12" stroke="#fff" strokeWidth="1.2" />
  </svg>
);
const SrcTiktok = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#010101" />
    <path d="M16.3 4h-2.1v10.2a2.15 2.15 0 1 1-1.5-2.05v-2.2A4.35 4.35 0 1 0 16.5 14.2V9.1a5.5 5.5 0 0 0 3.2 1v-2.2A3.4 3.4 0 0 1 16.3 4z" fill="#25F4EE" />
    <path d="M17 4.5h-2.1v10.2a2.15 2.15 0 1 1-1.5-2.05v-2.2A4.35 4.35 0 1 0 17.2 14.7V9.6a5.5 5.5 0 0 0 3.2 1V8.4A3.4 3.4 0 0 1 17 4.5z" fill="#FE2C55" />
    <path d="M16.65 4.25h-2.1v10.2a2.15 2.15 0 1 1-1.5-2.05v-2.2a4.35 4.35 0 1 0 3.8 4.3V9.35a5.5 5.5 0 0 0 3.2 1V8.15a3.4 3.4 0 0 1-3.4-3.9z" fill="#fff" />
  </svg>
);
const SrcOther = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5" fill="#94a3b8" />
    <circle cx="8" cy="12" r="1.5" fill="#fff" />
    <circle cx="12" cy="12" r="1.5" fill="#fff" />
    <circle cx="16" cy="12" r="1.5" fill="#fff" />
  </svg>
);

function sourceIcon(source) {
  const s = (source || "").toLowerCase();
  if (s.includes("facebook") || s.includes("fb")) return <SrcFacebook />;
  if (s.includes("zalo")) return <SrcZalo />;
  if (s.includes("hotline") || s.includes("phone") || s.includes("điện thoại") || s.includes("gọi")) return <SrcHotline />;
  if (s.includes("website") || s.includes("web") || s.includes("landing")) return <SrcWebsite />;
  if (s.includes("tiktok") || s.includes("tik tok")) return <SrcTiktok />;
  if (s.includes("sự kiện") || s.includes("event")) return <SrcOther />;
  return <SrcOther />;
}

/* ── Status badge styles (NKR, REG, NB, NE) ───── */
const enrollBadgeMap = {
  NKR: { bg: "#fff7ed", color: "#ea580c" },
  REG: { bg: "#f0fdf4", color: "#16a34a" },
  NB:  { bg: "#eff6ff", color: "#2563eb" },
  NE:  { bg: "#f8fafc", color: "#64748b" },
};

function StatusBadge({ lead }) {
  const bucket = enrollBucket(lead);
  const cfg = enrollBadgeMap[bucket] || enrollBadgeMap.NKR;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 6,
      background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 12,
      letterSpacing: "0.02em",
    }}>
      {bucket}
    </span>
  );
}

/* ── SLA status ─────────────────────────────────── */
function SlaStatus({ lead }) {
  const overdue = isClientOverdue(lead);
  if (lead.last_contact_at) {
    return <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>● Còn hạn</span>;
  }
  if (overdue) {
    return <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>⚠ Quá hạn</span>;
  }
  return <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>⚠ Sắp quá hạn</span>;
}

/* ── Detail panel tab content ──────────────────── */
function DetailInfo({ lead, detailCallStatus, updateContactCallStatus }) {
  const [pendingStatus, setPendingStatus] = useState(detailCallStatus || "");
  const [updated, setUpdated] = useState(false);

  // Sync when lead changes
  useEffect(() => { setPendingStatus(detailCallStatus || ""); setUpdated(false); }, [lead?.id, detailCallStatus]);

  if (!lead) return null;
  const source = lead.extra?.["Nguồn lead"] || lead.extra?.["Nguồn"] || lead.source || "-";
  const school = lead.extra?.["Trường"] || lead.extra?.["Chi nhánh"] || "-";
  const priority = lead.extra?.["Ưu tiên"] || lead.extra?.["Mức ưu tiên"] || "-";
  const changed = pendingStatus !== (detailCallStatus || "");

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <StatusBadge lead={lead} />
        <span style={{ fontSize: 13, color: "#64748b" }}>{callStatusFromLead(lead) || "Chưa gọi"}</span>
      </div>
      <div style={detailRow}><span style={detailLabel}>Mã lead</span><span style={detailValue}>{lead.external_id || "-"}</span></div>
      <div style={detailRow}><span style={detailLabel}>Ngày tạo</span><span style={detailValue}>{formatDt(lead.created_at)}</span></div>
      <div style={detailRow}><span style={detailLabel}>Trường</span><span style={detailValue}>{school}</span></div>
      <div style={detailRow}><span style={detailLabel}>Nguồn lead</span><span style={detailValue}>{source}</span></div>
      <div style={detailRow}><span style={detailLabel}>Tư vấn viên</span><span style={detailValue}>{lead.assigned_to_display || lead.assigned_to || "-"}</span></div>
      <div style={detailRow}><span style={detailLabel}>Ưu tiên</span><span style={detailValue}>{priority}</span></div>
      <div style={detailRow}><span style={detailLabel}>Hạn SLA</span><span style={detailValue}><SlaStatus lead={lead} /></span></div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Cập nhật tình trạng gọi</div>
        <select style={{ ...styles.input, width: "100%" }} value={pendingStatus} onChange={(e) => { setPendingStatus(e.target.value); setUpdated(false); }}>
          <option value="">Chưa gọi</option>
          {detailCallStatus && !CALL_STATUS_OPTIONS.includes(detailCallStatus) ? <option value={detailCallStatus}>{detailCallStatus}</option> : null}
          {CALL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          style={{ ...styles.btn, marginTop: 8, width: "100%", ...(updated ? { background: "#16a34a" } : {}), ...(!changed && !updated ? { opacity: 0.5, cursor: "default" } : {}) }}
          disabled={!changed && !updated}
          onClick={async () => {
            if (!changed) return;
            await updateContactCallStatus(lead.id, pendingStatus);
            setUpdated(true);
            setTimeout(() => setUpdated(false), 2000);
          }}
        >
          {updated ? "Đã cập nhật!" : "Cập nhật"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <a
          href={lead.phone ? `tel:${lead.phone}` : "#"}
          style={actionBtnGreen}
          onClick={(e) => { if (!lead.phone) e.preventDefault(); }}
        >
          Gọi ngay
        </a>
        <a
          href={lead.phone ? `https://zalo.me/${String(lead.phone).replace(/\D/g, "")}` : "#"}
          target="_blank"
          rel="noreferrer"
          style={actionBtnOrange}
          onClick={(e) => { if (!lead.phone) e.preventDefault(); }}
        >
          Nhắn tin
        </a>
      </div>
    </div>
  );
}

function DetailHistory({ lead }) {
  if (!lead) return null;
  const events = [];
  events.push({ type: "create", text: "Tạo mới lead", date: lead.created_at, color: "#22c55e" });
  if (lead.extra?.["Tình trạng gọi điện"]) {
    const calls = String(lead.extra["Tình trạng gọi điện"]).split(/[,;]/);
    calls.forEach((c, i) => {
      const txt = c.trim();
      if (txt) events.push({ type: "call", text: `Gọi lần ${i + 1} — ${txt}`, date: null, color: "#22c55e" });
    });
  }
  if (lead.last_contact_at) {
    events.push({ type: "contact", text: "Đã liên hệ thành công", date: lead.last_contact_at, color: "#22c55e" });
  }
  if (isClientOverdue(lead)) {
    events.push({ type: "overdue", text: "Quá hạn SLA lần 1", date: null, color: "#ef4444" });
  }

  // Parse notes/exchanges into history entries
  const exchange = lead.extra?.["Trao đổi gần nhất"] || lead.notes || "";
  if (exchange.trim()) {
    const blocks = exchange.split(/\n\n+/).filter(Boolean);
    blocks.forEach((block) => {
      const match = block.match(/^(.+?)\s+(\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4}):\s*(.+)$/s);
      if (match) {
        const [, author, time, date, content] = match;
        events.push({
          type: "note",
          text: content.trim(),
          author,
          dateStr: `${time} ${date}`,
          date: null,
          color: "#f97316",
        });
      } else {
        events.push({ type: "note", text: block.trim(), date: null, color: "#f97316" });
      }
    });
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {events.map((evt, i) => (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: evt.color, flexShrink: 0, marginTop: 3 }} />
            {i < events.length - 1 && <div style={{ width: 2, flex: 1, background: "#e2e8f0", marginTop: 4 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {evt.type === "note" && evt.author && (
              <div style={{ fontSize: 11, color: "#f97316", fontWeight: 600, marginBottom: 2 }}>{evt.author}</div>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{evt.text}</div>
            {evt.date && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{formatDt(evt.date)}</div>}
            {evt.dateStr && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{evt.dateStr}</div>}
          </div>
        </div>
      ))}
      {events.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>Chưa có lịch sử hoạt động.</p>}
    </div>
  );
}

function DetailNotes({ lead, appendNote }) {
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!lead) return null;

  async function handleSave() {
    const text = noteText.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      await appendNote(lead.id, text);
      setNoteText("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "4px 0" }}>
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        rows={5}
        style={{ ...styles.input, width: "100%", resize: "vertical" }}
        placeholder="Thêm ghi chú về lead này..."
      />
      <button
        style={{
          ...saveBtnStyle,
          ...(saved ? { background: "#16a34a", boxShadow: "0 4px 16px rgba(22,163,74,0.25)" } : {}),
          opacity: saving ? 0.7 : 1,
        }}
        onClick={handleSave}
        disabled={saving || !noteText.trim()}
      >
        {saving ? "Đang lưu..." : saved ? "Đã lưu ghi chú!" : "Lưu ghi chú"}
      </button>
    </div>
  );
}

/* ── Main Component ────────────────────────────── */

export default function LeadsTab(props) {
  const {
    user,
    phone,
    setPhone,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    enrollmentBucket,
    setEnrollmentBucket,
    overdueOnly,
    setOverdueOnly,
    callStatusGroups,
    toggleCallStatusGroup,
    onApplyFilters,
    selected,
    selectedCount,
    currentPageAllSelected,
    onToggleSelectAllCurrentPage,
    onSelectAllButton,
    bulkAction,
    setBulkAction,
    bulkAssignUser,
    setBulkAssignUser,
    assigneeChoices,
    bulkApplyFiltered,
    setBulkApplyFiltered,
    bulkOnlyOverdue,
    setBulkOnlyOverdue,
    bulkOnlyUncontacted,
    setBulkOnlyUncontacted,
    bulkWorking,
    onRunBulkAction,
    onClearSelection,
    visibleLeads,
    setActiveLeadId,
    toggleSelect,
    markContacted,
    deleteLead,
    leadsPage,
    totalLeadPages,
    setLeadsPage,
    leadsTotal,
    activeLead,
    appendNote,
    updateContactCallStatus,
    uploading,
    onUpload,
  } = props;

  const [detailTab, setDetailTab] = useState("info");
  const detailCallStatus = activeLead ? callStatusFromLead(activeLead) : "";

  const filterDirty = useRef(false);
  useEffect(() => {
    if (filterDirty.current) { filterDirty.current = false; onApplyFilters(); }
  }, [overdueOnly, callStatusGroups]);

  const activeEB = enrollmentBucket || "all";

  const statusTabs = [
    { id: "all", label: "Tất cả", count: leadsTotal, color: "#475569" },
    { id: "NKR", label: "NKR", count: activeEB === "NKR" ? leadsTotal : null, color: "#ea580c" },
    { id: "REG", label: "REG", count: activeEB === "REG" ? leadsTotal : null, color: "#16a34a" },
    { id: "NB", label: "NB", count: activeEB === "NB" ? leadsTotal : null, color: "#2563eb" },
    { id: "NE", label: "NE", count: activeEB === "NE" ? leadsTotal : null, color: "#64748b" },
  ];

  return (
    <div style={ui.wrap}>
      <section style={ui.main}>
        {/* Status filter tabs — client-side filter by enrollment bucket from Excel */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {statusTabs.map((st) => {
            const active = activeEB === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setEnrollmentBucket(active && st.id !== "all" ? "" : st.id === "all" ? "" : st.id)}
                style={{
                  ...statusTabBtn,
                  ...(active ? { background: st.color, color: "#fff", borderColor: st.color } : {}),
                }}
              >
                {st.label}{st.count != null && <span style={{ marginLeft: 4, fontWeight: 800 }}>{st.count}</span>}
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={ui.toolbar}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
            <div style={searchBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                style={searchInput}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Tìm tên, SĐT, mã..."
                onKeyDown={(e) => { if (e.key === "Enter") onApplyFilters(); }}
              />
            </div>
            <input type="date" style={styles.input} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span style={{ color: "#94a3b8" }}>~</span>
            <input type="date" style={styles.input} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button style={applyBtn} onClick={onApplyFilters}>Áp dụng</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {user.role === "admin" && (
              <button style={selectAllBtn} onClick={onSelectAllButton}>Chọn tất cả</button>
            )}
            {user.role === "admin" && (
              <label style={uploadBtnStyle}>
                {uploading ? "Đang tải..." : "Tải lên Excel"}
                <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onUpload} disabled={uploading} />
              </label>
            )}
          </div>
        </div>

        {/* Call status filter checkboxes */}
        <div style={filterRow}>
          {[
            { key: "chua_lien_he", label: "Chưa liên hệ", type: "group" },
            { key: "dang_lien_he", label: "Đang liên hệ", type: "group" },
            { key: "da_lien_he", label: "Đã liên hệ", type: "group" },
            { key: "overdue", label: "Trễ hạn", type: "overdue" },
            { key: "khac", label: "Khác (tình trạng gọi)", type: "group" },
          ].map((f) => {
            const checked = f.type === "overdue" ? overdueOnly : (callStatusGroups || []).includes(f.key);
            return (
              <label key={f.key} style={filterLabel}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    filterDirty.current = true;
                    if (f.type === "overdue") setOverdueOnly((v) => !v);
                    else toggleCallStatusGroup(f.key);
                  }}
                  style={filterCheckbox}
                />
                {f.label}
              </label>
            );
          })}
        </div>

        {/* Bulk action box */}
        {user.role === "admin" && selectedCount > 0 && (
          <div style={ui.bulkBox}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>✔ {selectedCount} lead đã chọn</strong>
              <select style={styles.input} value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                <option value="assign_to_user">Gán cho nhân viên</option>
                <option value="auto_assign_round_robin">Tự chia đều cho đội sale</option>
                <option value="auto_assign_least_workload">Tự gán cho người ít việc nhất</option>
                <option value="status_new_to_contacting">Mới -&gt; Đang liên hệ</option>
                <option value="mark_contacted">Đánh dấu đã liên hệ</option>
              </select>
              <button style={styles.btnGhost} onClick={onClearSelection}>Bỏ chọn</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={styles.chk}>
                <input type="checkbox" checked={bulkApplyFiltered} onChange={(e) => setBulkApplyFiltered(e.target.checked)} /> Áp dụng theo filter
              </label>
              <label style={styles.chk}>
                <input type="checkbox" checked={bulkOnlyOverdue} onChange={(e) => setBulkOnlyOverdue(e.target.checked)} /> Chỉ quá hạn
              </label>
              <label style={styles.chk}>
                <input type="checkbox" checked={bulkOnlyUncontacted} onChange={(e) => setBulkOnlyUncontacted(e.target.checked)} /> Chỉ chưa liên hệ
              </label>
              {bulkAction === "assign_to_user" && (
                <select style={styles.input} value={bulkAssignUser} onChange={(e) => setBulkAssignUser(e.target.value)}>
                  <option value="">Chọn người phụ trách</option>
                  {(assigneeChoices || []).map((u) => (
                    <option key={`${u.target_username}-${u.label}`} value={u.value}>{u.label}</option>
                  ))}
                </select>
              )}
              <button style={styles.btn} disabled={bulkWorking} onClick={onRunBulkAction}>
                {bulkWorking ? "Đang xử lý..." : "Thực hiện"}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={ui.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {user.role === "admin" && (
                  <th style={styles.th}>
                    <input type="checkbox" checked={currentPageAllSelected} onChange={(e) => onToggleSelectAllCurrentPage(e.target.checked)} />
                  </th>
                )}
                <th style={styles.th}>MÃ SỐ</th>
                <th style={styles.th}>NGÀY TẠO</th>
                <th style={styles.th}>TÊN HỌC SINH</th>
                <th style={styles.th}>NGUỒN</th>
                <th style={styles.th}>TRẠNG THÁI</th>
                <th style={styles.th}>TÌNH TRẠNG GỌI</th>
                <th style={styles.th}>TƯ VẤN VIÊN</th>
                <th style={styles.th}>HẠN SLA</th>
                <th style={styles.th}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((L) => {
                const isActive = activeLead?.id === L.id;
                const source = L.extra?.["Nguồn lead"] || L.extra?.["Nguồn"] || L.source || "-";
                const srcIcon = sourceIcon(source);
                return (
                  <tr
                    key={L.id}
                    style={{
                      ...tableRowStyle,
                      ...(isActive ? { background: "#fff7ed" } : {}),
                    }}
                    onClick={() => setActiveLeadId(L.id)}
                  >
                    {user.role === "admin" && (
                      <td style={styles.td}>
                        <input type="checkbox" checked={!!selected[L.id]} onChange={(e) => toggleSelect(L.id, e.target.checked)} onClick={(e) => e.stopPropagation()} />
                      </td>
                    )}
                    <td style={{ ...styles.td, fontWeight: 600, color: "#475569" }}>{L.external_id || "-"}</td>
                    <td style={styles.td}>{formatDt(L.created_at)}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>
                      <span style={{ color: isClientOverdue(L) ? "#ef4444" : "#0f172a" }}>● </span>
                      {L.name || "-"}
                    </td>
                    <td style={styles.td}>
                      <span style={{ marginRight: 4, display: "inline-flex", verticalAlign: "middle" }}>{srcIcon}</span>
                      {source}
                    </td>
                    <td style={styles.td}><StatusBadge lead={L} /></td>
                    <td style={{ ...styles.td, fontSize: 13, color: "#64748b" }}>{callStatusFromLead(L) || "Chưa gọi"}</td>
                    <td style={styles.td}>{L.assigned_to_display || L.assigned_to || "-"}</td>
                    <td style={styles.td}><SlaStatus lead={L} /></td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <a
                          href={L.phone ? `tel:${L.phone}` : "#"}
                          style={actionIcon("#22c55e")}
                          title="Gọi"
                          onClick={(e) => { if (!L.phone) e.preventDefault(); }}
                        >
                          <IconCall />
                        </a>
                        <a
                          href={L.phone ? `https://zalo.me/${String(L.phone).replace(/\D/g, "")}` : "#"}
                          target="_blank"
                          rel="noreferrer"
                          style={actionIcon("#2563eb")}
                          title="Nhắn Zalo"
                          onClick={(e) => { if (!L.phone) e.preventDefault(); }}
                        >
                          <IconChat />
                        </a>
                        {!L.last_contact_at && (
                          <button
                            style={actionIcon("#f59e0b")}
                            title="Đã liên hệ"
                            onClick={() => markContacted(L.id)}
                          >
                            <IconSmile />
                          </button>
                        )}
                        {user.role === "admin" && deleteLead && (
                          <button
                            style={actionIcon("#ef4444")}
                            title="Xóa lead"
                            onClick={() => {
                              if (window.confirm(`Xóa lead "${L.name || L.external_id || L.id}"?`)) deleteLead(L.id);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={ui.pager}>
          <small style={{ color: "#94a3b8" }}>
            Hiển thị {(leadsPage - 1) * LEADS_PAGE_SIZE + (visibleLeads.length ? 1 : 0)}-{(leadsPage - 1) * LEADS_PAGE_SIZE + visibleLeads.length} / {leadsTotal} lead
          </small>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button style={pageBtn} disabled={leadsPage <= 1} onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}>‹</button>
            {pagerPages(leadsPage, totalLeadPages).map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} style={{ padding: "0 4px", color: "#94a3b8", fontSize: 13 }}>...</span>
              ) : (
                <button
                  key={p}
                  style={{ ...pageBtn, ...(leadsPage === p ? pageBtnActive : {}) }}
                  onClick={() => setLeadsPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button style={pageBtn} disabled={leadsPage >= totalLeadPages} onClick={() => setLeadsPage((p) => Math.min(totalLeadPages, p + 1))}>›</button>
            <span style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 4px" }} />
            <input
              type="number"
              min={1}
              max={totalLeadPages}
              placeholder="Trang"
              style={pageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = Math.max(1, Math.min(totalLeadPages, Math.trunc(Number(e.target.value) || 1)));
                  setLeadsPage(v);
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* Detail Panel */}
      <section style={ui.side}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chi tiết lead</h3>
          {activeLead && (
            <button
              style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 18, padding: 4 }}
              onClick={() => setActiveLeadId(null)}
            >
              ✕
            </button>
          )}
        </div>

        {!activeLead && <p style={{ color: "#94a3b8", fontSize: 13 }}>Chọn một lead để xem chi tiết.</p>}

        {activeLead && (
          <>
            {/* Lead header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={detailAvatar}>
                {String(activeLead.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{activeLead.name || "-"}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>{activeLead.phone || "-"}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={detailTabRow}>
              {[
                { id: "info", label: "Thông tin" },
                { id: "history", label: "Lịch sử" },
                { id: "notes", label: "Ghi chú" },
              ].map((t) => (
                <button
                  key={t.id}
                  style={{
                    ...detailTabStyle,
                    ...(detailTab === t.id ? detailTabActive : {}),
                  }}
                  onClick={() => setDetailTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {detailTab === "info" && (
              <DetailInfo
                lead={activeLead}
                detailCallStatus={detailCallStatus}
                updateContactCallStatus={updateContactCallStatus}
              />
            )}
            {detailTab === "history" && <DetailHistory lead={activeLead} />}
            {detailTab === "notes" && <DetailNotes lead={activeLead} appendNote={appendNote} />}
          </>
        )}
      </section>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────── */

const ui = {
  wrap: { display: "flex", gap: 14, alignItems: "flex-start" },
  main: { ...styles.card, flex: 2, borderRadius: 16, minWidth: 0 },
  side: { ...styles.card, width: 360, minWidth: 340, maxWidth: 380, borderRadius: 16, position: "sticky", top: 70 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12, justifyContent: "space-between" },
  bulkBox: { border: "1px solid #cbd5e1", borderRadius: 12, padding: 10, marginBottom: 12, background: "#f8fafc" },
  tableWrap: { ...styles.tableScroll, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 },
};

const statusTabBtn = {
  border: "1px solid #e2e8f0", background: "#fff", borderRadius: 999,
  padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#475569",
  cursor: "pointer", transition: "all 0.2s ease",
};

const searchBox = {
  display: "flex", alignItems: "center", gap: 6,
  border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 10px",
  background: "#fff", minWidth: 180,
};
const searchInput = {
  border: "none", background: "transparent", outline: "none",
  fontSize: 13, flex: 1, minWidth: 0,
};

const applyBtn = {
  border: "none", background: "#0f172a", color: "#fff",
  borderRadius: 10, padding: "9px 16px", fontSize: 13,
  fontWeight: 700, cursor: "pointer",
};
const selectAllBtn = {
  border: "1px solid #0f172a", background: "#0f172a", color: "#fff",
  borderRadius: 10, padding: "9px 16px", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};
const uploadBtnStyle = {
  border: "none", background: "#217346", color: "#fff",
  borderRadius: 10, padding: "8px 14px", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};

const filterRow = {
  display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center",
  padding: "8px 0", marginBottom: 8,
};
const filterLabel = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 13, color: "#334155", cursor: "pointer", whiteSpace: "nowrap",
};
const filterCheckbox = {
  width: 15, height: 15, margin: 0, accentColor: "#f97316", cursor: "pointer",
};

const tableRowStyle = {
  cursor: "pointer", transition: "background 0.15s ease",
};

const actionIcon = (color) => ({
  width: 30, height: 30, borderRadius: 8,
  display: "inline-grid", placeItems: "center",
  color, background: `${color}12`, border: "none",
  cursor: "pointer", transition: "all 0.15s ease",
  textDecoration: "none",
});

const pageBtn = {
  width: 32, height: 32, borderRadius: 8,
  border: "1px solid #e2e8f0", background: "#fff",
  color: "#475569", fontSize: 13, fontWeight: 600,
  cursor: "pointer", display: "grid", placeItems: "center",
};
const pageBtnActive = {
  background: "#f97316", color: "#fff", borderColor: "#f97316",
};
const pageInput = {
  width: 56, padding: "5px 6px", borderRadius: 8,
  border: "1px solid #e2e8f0", fontSize: 13, textAlign: "center",
  outline: "none",
};

/** Build page numbers: 1 ... 4 5 [6] 7 8 ... 20 */
function pagerPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const detailAvatar = {
  width: 44, height: 44, borderRadius: 12,
  background: "linear-gradient(135deg, #f97316, #ea580c)",
  color: "#fff", display: "grid", placeItems: "center",
  fontWeight: 800, fontSize: 18, flexShrink: 0,
};

const detailTabRow = {
  display: "flex", gap: 0, borderBottom: "2px solid #f1f5f9",
  marginBottom: 14,
};
const detailTabStyle = {
  flex: 1, border: "none", background: "transparent",
  padding: "10px 0", fontSize: 13, fontWeight: 600,
  color: "#94a3b8", cursor: "pointer", textAlign: "center",
  borderBottom: "2px solid transparent", marginBottom: -2,
  transition: "all 0.2s ease",
};
const detailTabActive = {
  color: "#f97316", borderBottomColor: "#f97316",
};

const detailRow = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "8px 0", borderBottom: "1px solid #f8fafc",
};
const detailLabel = { fontSize: 13, color: "#94a3b8" };
const detailValue = { fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "right" };

const actionBtnGreen = {
  flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10,
  background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13,
  textDecoration: "none", display: "block",
};
const actionBtnOrange = {
  flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10,
  background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 13,
  textDecoration: "none", display: "block",
};

const saveBtnStyle = {
  width: "100%", border: "none", background: "#f97316",
  color: "#fff", borderRadius: 10, padding: "10px 0",
  fontSize: 14, fontWeight: 700, cursor: "pointer",
  marginTop: 10,
};
