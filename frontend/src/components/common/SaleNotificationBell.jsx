import { styles } from "../../styles/appStyles";

/** Sale: unread count; opens notifications tab. */
export default function SaleNotificationBell({ unreadCount, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Thông báo, ${unreadCount} chưa đọc`}
      style={{
        ...styles.badge,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        border: "1px solid #fde047",
        background: "linear-gradient(180deg, #fef9c3 0%, #fef08a 100%)",
        color: "#713f12",
        fontWeight: 800,
        boxShadow: "0 1px 4px rgba(113, 63, 18, 0.15)",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
      <span style={{ minWidth: 14, textAlign: "center" }}>{unreadCount}</span>
    </button>
  );
}
