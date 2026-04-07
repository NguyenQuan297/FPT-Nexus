import { useMemo, useState } from "react";
import { CALL_STATUS_OPTIONS, LEADS_PAGE_SIZE } from "../../constants/leadConstants";
import { badge, styles } from "../../styles/appStyles";
import { callStatusFromLead, formatDt, isClientOverdue, statusLabel } from "../../utils/leadUiHelpers";
import { parseConversationBlocks } from "../../utils/conversationNotes";

const STATUS_OPTIONS = ["new", "contacting", "active", "late", "closed"];

export default function SalesLeadsTab({
  visibleLeads,
  activeLead,
  setActiveLeadId,
  phone,
  setPhone,
  overdueOnly,
  setOverdueOnly,
  uncontactedOnly,
  setUncontactedOnly,
  onApplyFilters,
  markContacted,
  appendNote,
  updateLeadStatus,
  updateContactCallStatus,
  saveNotes,
  leadsPage,
  totalLeadPages,
  setLeadsPage,
  leadsTotal,
  applySalesPreset,
}) {
  const [noteDraft, setNoteDraft] = useState("");

  const conversation = useMemo(() => {
    if (!activeLead?.notes) return [];
    return parseConversationBlocks(activeLead.notes);
  }, [activeLead?.notes]);

  const presetActive = !overdueOnly && !uncontactedOnly ? "all" : overdueOnly ? "overdue" : "uncontacted";
  const detailCallStatus = activeLead ? callStatusFromLead(activeLead) : "";

  return (
    <div style={{ ...styles.split, alignItems: "stretch" }}>
      <section style={{ ...styles.card, flex: 1, minWidth: 280, maxWidth: 420, display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0 }}>Leads của tôi</h3>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: -6 }}>Chỉ lead được gán cho bạn — mỗi tài khoản độc lập.</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <button
            type="button"
            style={presetActive === "all" ? styles.btn : styles.btnGhost}
            onClick={() => applySalesPreset("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            style={presetActive === "uncontacted" ? styles.btn : styles.btnGhost}
            onClick={() => applySalesPreset("uncontacted")}
          >
            Chưa liên hệ
          </button>
          <button
            type="button"
            style={presetActive === "overdue" ? styles.btn : styles.btnGhost}
            onClick={() => applySalesPreset("overdue")}
          >
            Quá hạn
          </button>
        </div>
        <input
          style={{ ...styles.input, width: "100%", marginBottom: 8 }}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Lọc SĐT"
        />
        <button type="button" style={{ ...styles.btnGhost, marginBottom: 10 }} onClick={onApplyFilters}>
          Áp dụng lọc
        </button>

        <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          {visibleLeads.map((L) => {
            const overdue = isClientOverdue(L);
            const uncontacted = !L.last_contact_at && L.status !== "closed";
            const border = overdue ? "#fecaca" : uncontacted ? "#fde68a" : "#bbf7d0";
            return (
              <button
                key={L.id}
                type="button"
                onClick={() => setActiveLeadId(L.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: "1px solid #f1f5f9",
                  background: activeLead?.id === L.id ? "#f1f5f9" : "#fff",
                  borderLeft: `4px solid ${border}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{L.name || L.phone || "Khách"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  <span style={badge(L.status)}>{statusLabel(L.status)}</span>
                  {L.phone ? ` · ${L.phone}` : ""}
                </div>
                {callStatusFromLead(L) ? (
                  <div style={{ fontSize: 11, color: "#0f766e", marginTop: 4 }}>{callStatusFromLead(L)}</div>
                ) : null}
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{formatDt(L.created_at)}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 13 }}>
          <span style={{ color: "#64748b" }}>
            {(leadsPage - 1) * LEADS_PAGE_SIZE + 1}-{Math.min(leadsPage * LEADS_PAGE_SIZE, leadsTotal)} / {leadsTotal}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={styles.btnGhost} disabled={leadsPage <= 1} onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}>
              ←
            </button>
            <button
              type="button"
              style={styles.btnGhost}
              disabled={leadsPage >= totalLeadPages}
              onClick={() => setLeadsPage((p) => Math.min(totalLeadPages, p + 1))}
            >
              →
            </button>
          </div>
        </div>
      </section>

      <section style={{ ...styles.card, flex: 2, minWidth: 320, display: "flex", flexDirection: "column" }}>
        <h3 style={{ marginTop: 0 }}>Chi tiết (kiểu chat)</h3>
        {!activeLead && <p style={{ color: "#64748b" }}>Chọn một lead bên trái để xem và ghi chú.</p>}
        {activeLead && (
          <>
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{activeLead.name || "—"}</div>
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>
                SĐT:{" "}
                <a href={activeLead.phone ? `tel:${activeLead.phone}` : "#"} style={{ color: "#2563eb", fontWeight: 700 }}>
                  {activeLead.phone || "—"}
                </a>
                {activeLead.phone && (
                  <>
                    {" "}
                    <a
                      href={`https://zalo.me/${String(activeLead.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 8, fontWeight: 700 }}
                    >
                      Zalo
                    </a>
                  </>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                Nguồn: {activeLead.source || "—"} · Chi nhánh: {activeLead.branch || "—"}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", maxHeight: "min(52vh, 480px)", marginBottom: 12, paddingRight: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#64748b", marginBottom: 8 }}>Trao đổi</div>
              {conversation.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 14 }}>Chưa có ghi chú — thêm dòng bên dưới.</p>
              ) : (
                conversation.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {c.at || "—"} {c.user ? `· ${c.user}` : ""}
                    </div>
                    <div style={{ fontSize: 14, color: "#1e293b", whiteSpace: "pre-wrap" }}>{c.text}</div>
                  </div>
                ))
              )}
            </div>

            <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}>Thêm ghi chú</label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Đã gọi, phụ huynh hẹn gọi lại chiều..."
              style={{ ...styles.input, width: "100%", marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                style={styles.btn}
                onClick={async () => {
                  const t = noteDraft.trim();
                  if (!t) return;
                  await appendNote(activeLead.id, t);
                  setNoteDraft("");
                }}
              >
                Gửi ghi chú
              </button>
              <button type="button" style={styles.btnGhost} onClick={() => markContacted(activeLead.id)}>
                Đánh dấu đã liên hệ
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Trạng thái</label>
              <select
                style={styles.input}
                value={activeLead.status}
                onChange={(e) => updateLeadStatus(activeLead.id, e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tình trạng gọi điện</label>
              <select
                style={{ ...styles.input, minWidth: 220 }}
                value={detailCallStatus || ""}
                onChange={(e) => updateContactCallStatus(activeLead.id, e.target.value)}
              >
                <option value="">— Chưa chọn —</option>
                {detailCallStatus && !CALL_STATUS_OPTIONS.includes(detailCallStatus) ? (
                  <option value={detailCallStatus}>{detailCallStatus} (từ dữ liệu)</option>
                ) : null}
                {CALL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, color: "#64748b" }}>Sửa toàn bộ ô ghi chú (nâng cao)</summary>
              <textarea
                key={`full-${activeLead.id}-${activeLead.notes || ""}`}
                defaultValue={activeLead.notes || ""}
                rows={4}
                style={{ ...styles.input, width: "100%", marginTop: 8 }}
                onBlur={(e) => {
                  if (e.target.value !== (activeLead.notes || "")) saveNotes(activeLead.id, e.target.value);
                }}
              />
            </details>

            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
              SLA: {isClientOverdue(activeLead) ? "đang quá hạn" : "trong hạn"} · Cập nhật {activeLead.updated_at ? formatDt(activeLead.updated_at) : "—"}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
