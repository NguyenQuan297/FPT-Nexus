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
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span style={{ minWidth: 14, textAlign: "center" }}>{unreadCount}</span>
    </button>
  );
}
