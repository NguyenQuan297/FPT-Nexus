import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import AdminNotificationBell from "../common/AdminNotificationBell";
import SaleNotificationBell from "../common/SaleNotificationBell";

/* ── Page SVG icons (matching sidebar) ────────── */
const svgIcon = (paths) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
);
const pageIcons = {
  dashboard: svgIcon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  leads: svgIcon('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>'),
  users: svgIcon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  reports: svgIcon('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
  settings: svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  "sales-home": svgIcon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  "sales-leads": svgIcon('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>'),
  notifications: svgIcon('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'),
};

/** Top bar: page title, search, notifications, user menu. */
export default function AppTopBar({
  user,
  tab,
  roleLabel,
  unread,
  setTab,
  loadNotifs,
  setErr,
  notifs,
  logout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const pageTitle = {
    dashboard: "Tổng quan",
    leads: "Danh sách Lead",
    users: "Người dùng",
    reports: "Báo cáo",
    settings: "Cài đặt",
    "sales-home": "Trang chủ",
    "sales-leads": "Leads của tôi",
    notifications: "Thông báo",
  };

  const pageSubtitle = {
    dashboard: "Dashboard Overview",
    leads: "Quản lý & theo dõi lead",
    users: "Quản lý tài khoản hệ thống",
    reports: "Phân tích & thống kê hiệu suất",
    settings: "Cấu hình hệ thống",
    "sales-home": "Tổng quan hoạt động",
    "sales-leads": "Danh sách lead được gán",
    notifications: "Thông báo hệ thống",
  };

  const dateLabel = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={bar}
    >
      <div style={headerContent}>
        {/* Page title */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            style={left}
          >
            <span style={pageIconStyle}>{pageIcons[tab] || pageIcons.dashboard}</span>
            <div>
              <div style={titleStyle}>{pageTitle[tab] || "Dashboard"}</div>
              <div style={subtitleStyle}>
                {pageSubtitle[tab] || "Dashboard"} · {dateLabel}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div style={right}>
          {/* Notification bells */}
          {user.role !== "admin" && <SaleNotificationBell unreadCount={unread} onOpen={() => setTab("notifications")} />}
          {user.role === "admin" && (
            <AdminNotificationBell notifs={notifs} loadNotifs={loadNotifs} setErr={setErr} />
          )}

          <div style={separator} />

          {/* User menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <div style={userMenuArea} onClick={() => setMenuOpen((v) => !v)}>
              <div style={userAvatar}>
                {String(user.display_name || user.username || "AD").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                  {user.display_name || user.username}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.2 }}>
                  {roleLabel}
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={dropdownMenu}
                >
                  <div style={dropdownHeader}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                      {user.display_name || user.username}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      {user.email || `${user.username}@fpt.edu.vn`}
                    </div>
                    <div style={{ fontSize: 12, color: "#f97316", fontWeight: 600, marginTop: 4 }}>
                      {roleLabel}
                    </div>
                  </div>
                  <div style={dropdownDivider} />
                  {logout && (
                    <button
                      style={dropdownLogout}
                      onClick={() => { setMenuOpen(false); logout(); }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Đăng xuất
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* Gradient line */}
      <div style={gradientLine} />
    </motion.header>
  );
}

/* ── Styles ──────────────────────────────────────── */

const bar = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(16px)",
  borderBottom: "1px solid rgba(226,232,240,0.6)",
  marginBottom: 14,
  boxShadow: "0 2px 16px rgba(15,23,42,0.05)",
  position: "sticky", top: 0, zIndex: 20,
  borderRadius: 0,
};
const headerContent = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 12, padding: "10px 20px",
};
const left = { display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 };
const pageIconStyle = { display: "flex", alignItems: "center" };
const titleStyle = { fontSize: 17, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 };
const subtitleStyle = { marginTop: 1, fontSize: 12, color: "#94a3b8" };
const right = { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 };
const separator = { width: 1, height: 24, background: "#e2e8f0" };

const userMenuArea = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "4px 8px", borderRadius: 10, cursor: "pointer",
};
const userAvatar = {
  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  color: "#fff", display: "grid", placeItems: "center",
  fontWeight: 800, fontSize: 12,
  boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
};
const gradientLine = {
  height: 2,
  background: "linear-gradient(90deg, #f97316, #fb923c, transparent)",
};
const dropdownMenu = {
  position: "absolute", top: "calc(100% + 8px)", right: 0,
  width: 240, background: "#fff", borderRadius: 14,
  boxShadow: "0 12px 40px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)",
  border: "1px solid #e2e8f0", overflow: "hidden", zIndex: 50,
};
const dropdownHeader = {
  padding: "16px 16px 12px",
};
const dropdownDivider = {
  height: 1, background: "#e2e8f0", margin: "0 12px",
};
const dropdownLogout = {
  display: "flex", alignItems: "center", gap: 10,
  width: "100%", padding: "12px 16px", border: "none",
  background: "transparent", color: "#334155", fontSize: 14,
  fontWeight: 600, cursor: "pointer", textAlign: "left",
  transition: "background 0.15s ease",
};
