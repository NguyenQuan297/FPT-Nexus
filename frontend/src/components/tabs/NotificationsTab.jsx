import { formatDt } from "../../utils/leadUiHelpers";
import { styles } from "../../styles/appStyles";
import { apiFetch } from "../../api";

export default function NotificationsTab({ notifs, loadNotifs, setErr }) {
  const markRead = async (id) => {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      loadNotifs();
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  return (
    <section style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Thông báo</h3>
      <p style={{ color: "#64748b", fontSize: 14 }}>Chỉ thông báo của tài khoản đang đăng nhập (đa phiên độc lập).</p>
      {notifs.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Không có thông báo.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {notifs.map((n) => (
            <li
              key={n.id}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                marginBottom: 10,
                background: n.read_at ? "#f8fafc" : "#eff6ff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{n.title}</div>
              <div style={{ fontSize: 14, color: "#334155", marginTop: 4 }}>{n.body}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{formatDt(n.created_at)}</div>
              {!n.read_at && (
                <button type="button" style={{ ...styles.btnSm, marginTop: 8 }} onClick={() => markRead(n.id)}>
                  Đánh dấu đã đọc
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
