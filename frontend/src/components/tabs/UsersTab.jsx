import { useState } from "react";
import { styles } from "../../styles/appStyles";

const overlay = {
  position: "fixed", inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 16,
};
const modal = {
  background: "#fff", borderRadius: 16,
  padding: 20, maxWidth: 480, width: "100%",
  boxShadow: "0 20px 40px rgba(15,23,42,0.2)",
};

/* ── Role badge colors ─────────────────────────── */
const roleBadgeCfg = {
  admin: { bg: "#fff7ed", color: "#ea580c", label: "Admin" },
  manager: { bg: "#fdf2f8", color: "#db2777", label: "Manager" },
  sale: { bg: "#fdf2f8", color: "#db2777", label: "Sale" },
};

function RoleBadge({ role }) {
  const cfg = roleBadgeCfg[role] || roleBadgeCfg.sale;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontWeight: 700, fontSize: 12,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

/* ── SLA Progress Circle ───────────────────────── */
function SlaCircle({ pct }) {
  const val = pct != null ? Number(pct) : 0;
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (val / 100) * c;
  const color = val >= 100 ? "#22c55e" : val >= 90 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x="22" y="22" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill={color}>
          {val.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}

/* ── Online Status ─────────────────────────────── */
function OnlineStatus({ user: u }) {
  if (!u.is_active) return <span style={{ color: "#9f1239", fontWeight: 700, fontSize: 13 }}>● Đã khóa</span>;
  if (u.is_online) {
    return (
      <div>
        <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>● Online</div>
        {u.last_seen_label && <div style={{ color: "#94a3b8", fontSize: 11 }}>{u.last_seen_label}</div>}
      </div>
    );
  }
  if (u.last_active) {
    return (
      <div>
        <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>● Away</div>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>{u.last_active}</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13 }}>● Offline</div>
      {u.last_seen_label && <div style={{ color: "#94a3b8", fontSize: 11 }}>{u.last_seen_label}</div>}
    </div>
  );
}

export default function UsersTab({
  newUser,
  setNewUser,
  createUser,
  users,
  assigneeOptions = [],
  patchUser,
}) {
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const datalistId = "user-assignee-labels";

  const totalUsers = users.length;
  const onlineCount = users.filter((u) => u.is_online).length;
  const saleCount = users.filter((u) => u.role === "sale").length;

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (u.username || "").toLowerCase().includes(q) ||
        (u.display_name || "").toLowerCase().includes(q);
    }
    return true;
  });

  function openEdit(u) {
    setEditing(u);
    setEditForm({
      display_name: u.display_name || "",
      merge_leads_from_assignee: "",
      password: "",
      is_active: u.is_active,
      role: u.role,
    });
  }

  function closeEdit() {
    setEditing(null);
    setEditForm(null);
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editing || !editForm) return;
    const payload = {
      display_name: editForm.display_name.trim(),
      is_active: editForm.is_active,
      role: editForm.role,
    };
    if (editForm.password && editForm.password.trim()) payload.password = editForm.password.trim();
    if (editForm.merge_leads_from_assignee && editForm.merge_leads_from_assignee.trim()) {
      payload.merge_leads_from_assignee = editForm.merge_leads_from_assignee.trim();
    }
    try {
      await patchUser(editing.id, payload);
      closeEdit();
    } catch {
      // error surfaced in App
    }
  }

  const filterTabs = [
    { id: "all", label: "Tất cả" },
    { id: "admin", label: "Admin" },
    { id: "sale", label: "Sale" },
  ];

  return (
    <section style={{ ...styles.card, borderRadius: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>Quản lý người dùng</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Quản lý tài khoản và phân quyền hệ thống</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <SummaryCard value={totalUsers} label="Tổng users" color="#475569" />
          <SummaryCard value={onlineCount} label="Đang online" color="#22c55e" />
          <SummaryCard value={saleCount} label="Sale" color="#2563eb" />
        </div>
      </div>

      {/* Filter tabs + search + create button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={filterTabRow}>
            {filterTabs.map((t) => (
              <button
                key={t.id}
                style={{ ...filterTabBtn, ...(roleFilter === t.id ? filterTabBtnActive : {}) }}
                onClick={() => setRoleFilter(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={searchBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input style={searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm người dùng..." />
          </div>
        </div>
        <button style={createUserBtn} onClick={() => setShowCreateForm(!showCreateForm)}>
          + Tạo người dùng
        </button>
      </div>

      {/* Create form (toggleable) */}
      {showCreateForm && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 14, background: "#f8fafc" }}>
          <datalist id={datalistId}>
            {assigneeOptions.map((label) => <option key={label} value={label} />)}
          </datalist>
          <form onSubmit={(e) => { createUser(e); setShowCreateForm(false); }} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input style={styles.input} placeholder="Tên đăng nhập" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
            <input style={styles.input} placeholder="Mật khẩu" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
            <input style={styles.input} placeholder="Tên hiển thị" value={newUser.display_name || ""} onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })} list={datalistId} />
            <button type="submit" style={styles.btn}>Tạo mới</button>
            <button type="button" style={styles.btnGhost} onClick={() => setShowCreateForm(false)}>Hủy</button>
          </form>
        </div>
      )}

      {/* Users table */}
      <div style={{ ...styles.tableScroll, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <table style={styles.table}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={styles.th}>NGƯỜI DÙNG</th>
              <th style={styles.th}>EMAIL</th>
              <th style={styles.th}>VAI TRÒ</th>
              <th style={styles.th}>TRƯỜNG</th>
              <th style={styles.th}>LEADS</th>
              <th style={styles.th}>SLA</th>
              <th style={styles.th}>REG%</th>
              <th style={styles.th}>TRẠNG THÁI</th>
              <th style={styles.th}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const initials = String(u.display_name || u.username || "??").slice(0, 2).toUpperCase();
              const avatarBg = u.role === "admin" ? "#f97316" : u.role === "manager" ? "#8b5cf6" : "#2563eb";
              const school = u.display_name ? extractSchool(u.display_name) : "-";
              return (
                <tr key={u.id} style={{ transition: "background 0.15s" }}>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: avatarBg, color: "#fff",
                        display: "grid", placeItems: "center",
                        fontWeight: 800, fontSize: 13, flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{u.display_name || u.username}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: "#64748b", fontSize: 13 }}>{u.email || `${u.username}@fpt.edu.vn`}</td>
                  <td style={styles.td}><RoleBadge role={u.role} /></td>
                  <td style={{ ...styles.td, fontSize: 13 }}>{school}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{u.leads ?? "-"}</td>
                  <td style={styles.td}><SlaCircle pct={u.sla_pct} /></td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 14 }}>↗</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{u.reg_pct != null ? `${Number(u.reg_pct).toFixed(1)}%` : "-"}</span>
                    </div>
                  </td>
                  <td style={styles.td}><OnlineStatus user={u} /></td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button style={editBtn} onClick={() => openEdit(u)} title="Chỉnh sửa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button style={deleteBtn} title="Xóa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && editForm && (
        <div style={overlay} role="presentation" onClick={closeEdit}>
          <div style={modal} role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
            <h4 style={{ marginTop: 0, marginBottom: 14, fontSize: 16, fontWeight: 700 }}>Chỉnh sửa: {editing.username}</h4>
            <form onSubmit={submitEdit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={formLabel}>
                <span style={formLabelText}>Tên hiển thị (Excel)</span>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  list={datalistId}
                  placeholder="VD: Phạm Thị Hà Thu"
                />
              </label>
              <label style={formLabel}>
                <span style={formLabelText}>Gộp lead từ nhãn Excel</span>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  value={editForm.merge_leads_from_assignee}
                  onChange={(e) => setEditForm({ ...editForm, merge_leads_from_assignee: e.target.value })}
                  list={datalistId}
                  placeholder="Chọn hoặc gõ khớp chính xác"
                />
              </label>
              <label style={formLabel}>
                <span style={formLabelText}>Mật khẩu mới</span>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Để trống nếu không đổi"
                />
              </label>
              <label style={{ ...styles.chk, padding: "4px 0" }}>
                <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                Tài khoản hoạt động
              </label>
              <label style={formLabel}>
                <span style={formLabelText}>Role</span>
                <select style={styles.input} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="sale">sale</option>
                  <option value="manager">manager</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" style={styles.btnGhost} onClick={closeEdit}>Huỷ</button>
                <button type="submit" style={{ ...styles.btn, background: "#f97316" }}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

/* ── Helper: extract school name from display_name ── */
function extractSchool(name) {
  const match = /FSC?\s*([\wÀ-ỹ\s]+)/i.exec(name);
  if (match) return `FPT ${match[1].trim()}`;
  if (/hà nội|hn/i.test(name)) return "FPT Hà Nội";
  if (/hải phòng|hp/i.test(name)) return "FPT Hải Phòng";
  if (/đà nẵng|dn/i.test(name)) return "FPT Đà Nẵng";
  if (/hcm|sài gòn|sg/i.test(name)) return "FPT HCM";
  return "Toàn hệ thống";
}

/* ── Summary Card ────────────────────────────────── */
function SummaryCard({ value, label, color }) {
  return (
    <div style={{
      border: "1px solid #e2e8f0", borderRadius: 14,
      padding: "10px 20px", textAlign: "center", minWidth: 90,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────── */

const filterTabRow = {
  display: "flex", gap: 0, borderRadius: 10, overflow: "hidden",
  border: "1px solid #e2e8f0",
};
const filterTabBtn = {
  border: "none", background: "#fff", color: "#64748b",
  padding: "7px 14px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "all 0.2s ease",
};
const filterTabBtnActive = {
  background: "#0f172a", color: "#fff",
};

const searchBox = {
  display: "flex", alignItems: "center", gap: 6,
  border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 10px",
  background: "#fff", minWidth: 200,
};
const searchInput = {
  border: "none", background: "transparent", outline: "none",
  fontSize: 13, flex: 1, minWidth: 0,
};

const createUserBtn = {
  border: "none", background: "#22c55e", color: "#fff",
  borderRadius: 10, padding: "9px 16px", fontSize: 13,
  fontWeight: 700, cursor: "pointer",
};

const editBtn = {
  width: 32, height: 32, borderRadius: 8,
  display: "grid", placeItems: "center",
  border: "1px solid #e2e8f0", background: "#fff",
  color: "#64748b", cursor: "pointer",
};
const deleteBtn = {
  width: 32, height: 32, borderRadius: 8,
  display: "grid", placeItems: "center",
  border: "1px solid #fecaca", background: "#fff",
  color: "#ef4444", cursor: "pointer",
};

const formLabel = {
  display: "flex", alignItems: "center", gap: 10,
};
const formLabelText = {
  minWidth: 160, fontSize: 13, fontWeight: 600, color: "#475569",
};
