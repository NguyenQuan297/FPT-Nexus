import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../api";
import { formatDt } from "../../utils/leadUiHelpers";
/** Admin: notification dropdown in top bar. */
export default function AdminNotificationBell({ notifs, loadNotifs, setErr }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const unread = notifs.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    setErr(null);
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
      await loadNotifs();
    } catch (err) {
      setErr(String(err.message || err));
    }
    setOpen(true);
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        zIndex: 5,
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Thông báo từ sale"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 9999,
          border: "1px solid #e9d5ff",
          background: "linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%)",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(91, 33, 182, 0.12)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#312e81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span style={{ fontWeight: 800, color: "#312e81", fontSize: 15, minWidth: 14, textAlign: "center" }}>
          {unread}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Danh sách thông báo"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            zIndex: 1000,
            width: 400,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "min(72vh, 480px)",
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            boxShadow: "0 16px 48px rgba(15, 23, 42, 0.15)",
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 10 }}>
            Hoạt động từ nhân viên kinh doanh
          </div>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: -4, marginBottom: 12, lineHeight: 1.45 }}>
            Nội dung chi tiết giống tin Telegram. Đã đánh dấu đã xem khi bạn mở khung này.
          </p>
          {notifs.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Chưa có thông báo.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {notifs.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: 13,
                    color: "#334155",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{n.title}</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>{formatDt(n.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
