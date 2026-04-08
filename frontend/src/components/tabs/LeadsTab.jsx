import { CALL_STATUS_OPTIONS, LEADS_PAGE_SIZE, STATUS_OPTIONS } from "../../constants/leadConstants";
import { badge, styles } from "../../styles/appStyles";
import { callStatusFromLead, formatDt, isClientOverdue, rowStyle, statusLabel } from "../../utils/leadUiHelpers";

export default function LeadsTab(props) {
  const {
    user,
    assigned,
    setAssigned,
    phone,
    setPhone,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    overdueOnly,
    setOverdueOnly,
    statusMulti,
    toggleStatus,
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
    bulkInterest,
    setBulkInterest,
    bulkFollowUpAt,
    setBulkFollowUpAt,
    bulkApplyFiltered,
    setBulkApplyFiltered,
    bulkOnlyOverdue,
    setBulkOnlyOverdue,
    bulkOnlyUncontacted,
    setBulkOnlyUncontacted,
    bulkWorking,
    onRunBulkAction,
    onClearSelection,
    assigneeOptions,
    visibleLeads,
    setActiveLeadId,
    toggleSelect,
    markContacted,
    assignPick,
    setAssignPick,
    doAssign,
    leadsPage,
    totalLeadPages,
    pageInput,
    setPageInput,
    commitPageInput,
    setLeadsPage,
    leadsTotal,
    activeLead,
    saveNotes,
    updateContactCallStatus,
  } = props;

  const detailCallStatus = activeLead ? callStatusFromLead(activeLead) : "";

  return (
    <div style={styles.split}>
      <section style={{ ...styles.card, flex: 2 }}>
        <h3>Danh sách lead</h3>
        <div style={styles.filters}>
          {user.role === "admin" && (
            <input style={styles.input} value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Người phụ trách" />
          )}
          <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tìm số điện thoại" />
          <input type="date" style={styles.input} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" style={styles.input} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <label style={styles.chk}><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Chỉ xem lead quá hạn</label>
          <button style={styles.btn} onClick={onApplyFilters}>Áp dụng</button>
        </div>
        {overdueOnly && (
          <small style={{ color: "#b91c1c", display: "block", marginBottom: 8 }}>
            Đang bật bộ lọc: chỉ hiển thị lead quá hạn.
          </small>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {STATUS_OPTIONS.map((s) => (
            <label key={s} style={styles.chk}>
              <input type="checkbox" checked={statusMulti.includes(s)} onChange={() => toggleStatus(s)} />{" "}
              {s === "new" ? "Mới (trống thông tin liên hệ)" : statusLabel(s)}
            </label>
          ))}
        </div>

        {user.role === "admin" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button style={styles.btn} onClick={onSelectAllButton}>Chọn tất cả theo bộ lọc</button>
          </div>
        )}

        {user.role === "admin" && selectedCount > 0 && (
          <div style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 10, marginBottom: 12, background: "#f8fafc" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ color: "#0f172a" }}>✔ {selectedCount} lead đã chọn</strong>
              <select style={styles.input} value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                <option value="assign_to_user">Gán cho nhân viên</option>
                <option value="auto_assign_round_robin">Tự chia đều cho đội sale</option>
                <option value="auto_assign_least_workload">Tự gán cho người ít việc nhất</option>
                <option value="status_new_to_contacting">Chuyển trạng thái: Mới -&gt; Đang liên hệ</option>
                <option value="status_contacting_to_da_nghe_may">Chuyển trạng thái: Đang liên hệ -&gt; Đã nghe máy</option>
                <option value="mark_contacted">Đánh dấu đã liên hệ (cập nhật trao đổi gần nhất)</option>
                <option value="update_interest">Cập nhật mức độ quan tâm</option>
                <option value="set_follow_up">Đặt ngày chăm sóc lại</option>
                <option value="mark_can_delete">Đánh dấu lead cần xóa</option>
                <option value="detect_duplicates">Tìm lead trùng số điện thoại</option>
                <option value="detect_bad_phone">Kiểm tra số điện thoại lỗi</option>
                <option value="export_selected_csv">Xuất dữ liệu đã chọn (CSV)</option>
              </select>
              <button style={styles.btnGhost} onClick={onClearSelection}>Bỏ chọn</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={styles.chk}>
                <input type="checkbox" checked={bulkApplyFiltered} onChange={(e) => setBulkApplyFiltered(e.target.checked)} />
                Áp dụng theo toàn bộ filter hiện tại
              </label>
              <label style={styles.chk}>
                <input type="checkbox" checked={bulkOnlyOverdue} onChange={(e) => setBulkOnlyOverdue(e.target.checked)} />
                Chỉ áp dụng cho lead quá hạn
              </label>
              <label style={styles.chk}>
                <input type="checkbox" checked={bulkOnlyUncontacted} onChange={(e) => setBulkOnlyUncontacted(e.target.checked)} />
                Chỉ áp dụng cho lead chưa liên hệ
              </label>
              {bulkAction === "assign_to_user" && (
                <select style={styles.input} value={bulkAssignUser} onChange={(e) => setBulkAssignUser(e.target.value)}>
                  <option value="">Chọn người phụ trách</option>
                  {(assigneeChoices || []).map((u) => (
                    <option key={`${u.target_username}-${u.label}`} value={u.value}>{u.label}</option>
                  ))}
                </select>
              )}
              {bulkAction === "update_interest" && (
                <select style={styles.input} value={bulkInterest} onChange={(e) => setBulkInterest(e.target.value)}>
                  <option value="Quan tâm">Quan tâm</option>
                  <option value="Suy nghĩ thêm">Suy nghĩ thêm</option>
                  <option value="Không quan tâm">Không quan tâm</option>
                </select>
              )}
              {bulkAction === "set_follow_up" && (
                <input
                  type="datetime-local"
                  style={styles.input}
                  value={bulkFollowUpAt}
                  onChange={(e) => setBulkFollowUpAt(e.target.value)}
                />
              )}
              <button style={styles.btn} disabled={bulkWorking} onClick={onRunBulkAction}>
                {bulkWorking ? "Đang xử lý..." : "Thực hiện"}
              </button>
            </div>
          </div>
        )}

        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                {user.role === "admin" && (
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      checked={currentPageAllSelected}
                      onChange={(e) => onToggleSelectAllCurrentPage(e.target.checked)}
                    />
                  </th>
                )}
                <th style={styles.th}>Ngày tạo</th>
                <th style={styles.th}>Mã KH</th>
                <th style={styles.th}>Tên học sinh</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Tình trạng gọi</th>
                <th style={styles.th}>Người phụ trách</th>
                <th style={styles.th}>Lần liên hệ cuối</th>
                <th style={styles.th}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {visibleLeads.map((L) => (
                <tr key={L.id} style={rowStyle(L)} onClick={() => setActiveLeadId(L.id)}>
                  {user.role === "admin" && (
                    <td style={styles.td}>
                      <input type="checkbox" checked={!!selected[L.id]} onChange={(e) => toggleSelect(L.id, e.target.checked)} />
                    </td>
                  )}
                  <td style={styles.td}>{formatDt(L.created_at)}</td>
                  <td style={styles.td}>{L.external_id || "-"}</td>
                  <td style={styles.td}>{L.name || "-"}</td>
                  <td style={styles.td}><span style={badge(L.status)}>{statusLabel(L.status)}</span></td>
                  <td style={{ ...styles.td, fontSize: 12, maxWidth: 200 }} title={callStatusFromLead(L) || ""}>
                    {callStatusFromLead(L) || "—"}
                  </td>
                  <td style={styles.td}>{L.assigned_to_display || L.assigned_to || "-"}</td>
                  <td style={styles.td}>{L.last_contact_at ? formatDt(L.last_contact_at) : "-"}</td>
                  <td style={styles.td}>
                    {(() => {
                      const isContacted = L.status === "active" || L.status === "closed";
                      if (isContacted) {
                        return <span style={{ color: "#64748b", fontSize: 12 }}>Đã liên hệ</span>;
                      }
                      const q = String(assignPick[L.id] || "").trim().toLowerCase();
                      const filtered = (assigneeChoices || [])
                        .filter((u) => u.label.toLowerCase().includes(q) || u.target_username.toLowerCase().includes(q))
                        .slice(0, 30);
                      return (
                        <>
                          <a
                            href={L.phone ? `tel:${L.phone}` : "#"}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!L.phone) e.preventDefault();
                            }}
                            style={{ ...styles.btnSm, textDecoration: "none", display: "inline-block" }}
                          >
                            Gọi
                          </a>
                          <a
                            href={L.phone ? `https://zalo.me/${String(L.phone).replace(/\D/g, "")}` : "#"}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!L.phone) e.preventDefault();
                            }}
                            style={{ ...styles.btnSm, textDecoration: "none", display: "inline-block" }}
                          >
                            Zalo
                          </a>
                          <button style={styles.btnSm} onClick={(e) => { e.stopPropagation(); markContacted(L.id); }}>Đã liên hệ</button>
                          {user.role === "admin" && (
                            <>
                              <input
                                list={`assignee-options-${L.id}`}
                                style={{ ...styles.input, minWidth: 150, marginLeft: 6, padding: "4px 6px" }}
                                placeholder="Đổi người phụ trách"
                                value={assignPick[L.id] || ""}
                                onChange={(e) => setAssignPick((p) => ({ ...p, [L.id]: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <datalist id={`assignee-options-${L.id}`}>
                                {filtered.map((u) => (
                                  <option key={`${L.id}-${u.target_username}-${u.label}`} value={u.label} />
                                ))}
                              </datalist>
                              <button style={styles.btnSm} onClick={(e) => { e.stopPropagation(); doAssign(L.id); }}>Gán</button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <small style={{ color: "#64748b" }}>
            Hiển thị {(leadsPage - 1) * LEADS_PAGE_SIZE + (visibleLeads.length ? 1 : 0)}-
            {(leadsPage - 1) * LEADS_PAGE_SIZE + visibleLeads.length} / {leadsTotal}
          </small>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              style={styles.btnGhost}
              disabled={leadsPage <= 1}
              onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            <span style={{ fontSize: 13, color: "#475569" }}>
              Trang {leadsPage}/{totalLeadPages}
            </span>
            <label style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
              Đến trang
              <input
                type="number"
                min={1}
                max={totalLeadPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitPageInput();
                  }
                }}
                style={{ ...styles.input, minWidth: 72, width: 72, padding: "6px 8px" }}
              />
            </label>
            <button
              style={styles.btnGhost}
              disabled={leadsPage >= totalLeadPages}
              onClick={() => setLeadsPage((p) => Math.min(totalLeadPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      <section style={{ ...styles.card, flex: 1, minWidth: 260 }}>
        <h3>Chi tiết lead</h3>
        {!activeLead && <p style={{ color: "#64748b" }}>Chọn một lead để xem chi tiết và lịch sử xử lý.</p>}
        {activeLead && (
          <>
            <p><strong>{activeLead.name || "-"}</strong></p>
            <p>Mã KH: {activeLead.external_id || "-"}</p>
            <p>Số điện thoại: {activeLead.phone || "-"}</p>
            <p>Trạng thái: <span style={badge(activeLead.status)}>{statusLabel(activeLead.status)}</span></p>
            <p style={{ marginBottom: 8 }}>
              <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Tình trạng gọi điện</label>
              <select
                style={styles.input}
                value={detailCallStatus || ""}
                onChange={(e) => updateContactCallStatus(activeLead.id, e.target.value)}
              >
                <option value="">— Chưa chọn / xóa —</option>
                {detailCallStatus && !CALL_STATUS_OPTIONS.includes(detailCallStatus) ? (
                  <option value={detailCallStatus}>{detailCallStatus} (từ dữ liệu)</option>
                ) : null}
                {CALL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </p>
            <p>Người phụ trách: {activeLead.assigned_to_display || activeLead.assigned_to || "-"}</p>
            <p>Ngày tạo: {formatDt(activeLead.created_at)}</p>
            <p style={{ marginBottom: 6, fontWeight: 600 }}>Trao đổi gần nhất</p>
            <textarea
              key={`${activeLead.id}-${activeLead.notes || ""}`}
              defaultValue={activeLead.notes || ""}
              rows={4}
              style={{ ...styles.input, width: "100%" }}
              onBlur={(e) => {
                if (e.target.value !== (activeLead.notes || "")) saveNotes(activeLead.id, e.target.value);
              }}
            />
            {activeLead.extra && (
              <>
                <h4>Thông tin bổ sung</h4>
                <ul style={{ paddingLeft: 16, color: "#475569" }}>
                  {Object.entries(activeLead.extra)
                    .filter(
                      ([k]) =>
                        !["Trao đổi gần nhất", "Mô tả leadform", "Tình trạng gọi điện", "Tình trạng cuộc gọi"].includes(k)
                    )
                    .map(([k, v]) => (
                      <li key={k}>
                        <strong>{k}:</strong> {String(v || "-")}
                      </li>
                    ))}
                </ul>
              </>
            )}
            <h4>Lịch sử</h4>
            <ul style={{ paddingLeft: 16, color: "#475569" }}>
              <li>Tạo lead: {formatDt(activeLead.created_at)}</li>
              <li>Gán cho: {activeLead.assigned_to_display || activeLead.assigned_to || "-"}</li>
              <li>Đã liên hệ: {activeLead.last_contact_at ? formatDt(activeLead.last_contact_at) : "Chưa liên hệ"}</li>
              <li>Quá hạn SLA: {isClientOverdue(activeLead) ? "Có" : "Không"}</li>
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
