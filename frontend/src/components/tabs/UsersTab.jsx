import { useState } from "react";
import { styles } from "../../styles/appStyles";

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modal = {
  background: "#fff",
  borderRadius: 12,
  padding: 18,
  maxWidth: 480,
  width: "100%",
  boxShadow: "0 20px 40px rgba(15,23,42,0.2)",
};

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
  const datalistId = "user-assignee-labels";

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
    if (editForm.password && editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }
    if (editForm.merge_leads_from_assignee && editForm.merge_leads_from_assignee.trim()) {
      payload.merge_leads_from_assignee = editForm.merge_leads_from_assignee.trim();
    }
    try {
      await patchUser(editing.id, payload);
      closeEdit();
    } catch {
      // lỗi đã hiển thị ở App
    }
  }

  return (
    <section style={styles.card}>
      <h3>Quản lý người dùng</h3>
      <datalist id={datalistId}>
        {assigneeOptions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <form onSubmit={createUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          style={styles.input}
          placeholder="Tên đăng nhập"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          required
        />
        <input
          style={styles.input}
          placeholder="Mật khẩu"
          type="password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          required
        />
        <input
          style={styles.input}
          placeholder="Tên hiển thị như Excel (khác username)"
          value={newUser.display_name || ""}
          onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
          list={datalistId}
        />
        <input style={{ ...styles.input, background: "#f8fafc" }} value="sale" disabled />
        <button type="submit" style={styles.btn}>
          Tạo mới
        </button>
      </form>
      <div style={styles.tableScroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tên đăng nhập</th>
              <th style={styles.th}>Người phụ trách (Excel)</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Leads</th>
              <th style={styles.th}>SLA</th>
              <th style={styles.th}>REG %</th>
              <th style={styles.th}>Hoạt động</th>
              <th style={styles.th} />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={styles.td}>{u.username}</td>
                <td style={styles.td}>{u.display_name ? u.display_name : "—"}</td>
                <td style={styles.td}>{u.role}</td>
                <td style={styles.td}>{u.leads ?? "-"}</td>
                <td style={styles.td}>{u.sla_pct != null ? `${Number(u.sla_pct).toFixed(1)}%` : "-"}</td>
                <td style={styles.td}>{u.reg_pct != null ? `${Number(u.reg_pct).toFixed(1)}%` : "-"}</td>
                <td style={styles.td}>
                  {!u.is_active ? (
                    <span style={{ color: "#9f1239", fontWeight: 700 }}>Đã khóa</span>
                  ) : u.is_online ? (
                    <span style={{ color: "#166534", fontWeight: 700 }}>Đang online</span>
                  ) : (
                    <span style={{ color: "#64748b" }}>Offline</span>
                  )}
                </td>
                <td style={styles.td}>
                  <button type="button" style={styles.btnSm} onClick={() => openEdit(u)}>
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && editForm && (
        <div style={overlay} role="presentation" onClick={closeEdit}>
          <div style={modal} role="dialog" aria-modal="true" onClick={(ev) => ev.stopPropagation()}>
            <h4 style={{ marginTop: 0 }}>Chỉnh sửa: {editing.username}</h4>
            <form onSubmit={submitEdit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={styles.chk}>
                <span style={{ minWidth: 160 }}>Tên hiển thị (Excel)</span>
                <input
                  style={{ ...styles.input, flex: 1, minWidth: 200 }}
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  list={datalistId}
                  placeholder="VD: Phạm Thị Hà Thu FSC Hải Phòng — không điền username đăng nhập"
                />
              </label>
              <label style={styles.chk}>
                <span style={{ minWidth: 160 }}>Gộp lead từ nhãn Excel</span>
                <input
                  style={{ ...styles.input, flex: 1, minWidth: 200 }}
                  value={editForm.merge_leads_from_assignee}
                  onChange={(e) => setEditForm({ ...editForm, merge_leads_from_assignee: e.target.value })}
                  list={datalistId}
                  placeholder="Chọn hoặc gõ khớp chính xác cột người phụ trách cũ"
                />
              </label>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                Gộp: mọi lead đang gán đúng chuỗi này sẽ chuyển sang username <strong>{editing.username}</strong> (một lần khi lưu).
              </p>
              <label style={styles.chk}>
                <span style={{ minWidth: 160 }}>Mật khẩu mới</span>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Để trống nếu không đổi"
                />
              </label>
              <label style={styles.chk}>
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
                Tài khoản hoạt động
              </label>
              <label style={styles.chk}>
                <span style={{ minWidth: 160 }}>Role</span>
                <select
                  style={styles.input}
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="sale">sale</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" style={styles.btnGhost} onClick={closeEdit}>
                  Huỷ
                </button>
                <button type="submit" style={styles.btnPrimary}>
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
