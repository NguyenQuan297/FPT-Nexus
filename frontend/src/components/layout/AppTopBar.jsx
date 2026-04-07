import AdminNotificationBell from "../common/AdminNotificationBell";
import SaleNotificationBell from "../common/SaleNotificationBell";
import { styles } from "../../styles/appStyles";

/**
 * Thanh trên vùng nội dung: badge trạng thái, upload Excel (admin), chuông thông báo / đăng xuất.
 */
export default function AppTopBar({
  user,
  roleLabel,
  nowLabel,
  unread,
  overdueCount,
  uploading,
  onUpload,
  setTab,
  loadNotifs,
  setErr,
  notifs,
  logout,
}) {
  return (
    <header
      style={{
        ...styles.topbar,
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ ...styles.badge, background: "#dcfce7", color: "#166534" }}>● Trực tuyến</span>
        <span
          style={{
            ...styles.badge,
            background: user.role === "admin" ? "rgba(0,93,170,0.14)" : "#dbeafe",
            color: user.role === "admin" ? "#005DAA" : "#1d4ed8",
          }}
        >
          Vai trò: {roleLabel}
        </span>
        <span style={styles.badge}>🕒 {nowLabel}</span>
        {user.role !== "admin" && (
          <SaleNotificationBell unreadCount={unread} onOpen={() => setTab("notifications")} />
        )}
        <span style={{ ...styles.badge, color: overdueCount ? "#b91c1c" : "#475569" }}>⚠ {overdueCount} quá hạn</span>
        {user.role === "admin" && (
          <label style={styles.btnPrimary}>
            {uploading ? "Đang tải lên..." : "Tải lên Excel"}
            <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onUpload} disabled={uploading} />
          </label>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: "auto" }}>
        {user.role === "admin" && (
          <AdminNotificationBell notifs={notifs} loadNotifs={loadNotifs} setErr={setErr} />
        )}
        {user.role !== "admin" && (
          <button type="button" style={styles.btnGhost} onClick={() => logout()}>
            Đăng xuất
          </button>
        )}
      </div>
    </header>
  );
}
