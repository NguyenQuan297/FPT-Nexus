import { motion, AnimatePresence } from "motion/react";
import BrandLogo from "../common/BrandLogo";

/* ── SVG Icon components ──────────────────────────── */
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconLeads = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconReports = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconNotification = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconHelp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const navIconMap = {
  dashboard: IconDashboard,
  leads: IconLeads,
  users: IconUsers,
  reports: IconReports,
  settings: IconSettings,
  notifications: IconNotification,
  "sales-home": IconHome,
  "sales-leads": IconLeads,
};

/** Left nav: logo and role-based items with animations. */
export default function AppSidebar({ user, tab, setTab, loadUsers, loadAssignees, loadReport, totalLeads, logout }) {
  const isSale = user.role === "sale";
  const menuItems = isSale
    ? [
        { id: "sales-home", label: "Trang chủ" },
        { id: "sales-leads", label: "Leads của tôi" },
        { id: "notifications", label: "Thông báo" },
      ]
    : [
        { id: "dashboard", label: "Tổng quan" },
        { id: "leads", label: "Danh sách Lead", badge: totalLeads || null },
        ...(user.role === "admin" ? [{ id: "users", label: "Người dùng" }, { id: "reports", label: "Báo cáo" }] : []),
      ];

  const systemItems = isSale ? [] : [{ id: "settings", label: "Cài đặt" }];

  function onNav(id) {
    if (id === "help") return;
    setTab(id);
    if (id === "users") {
      loadUsers();
      loadAssignees();
    }
    if (id === "reports") loadReport();
  }

  function renderNavItem(it, index) {
    const active = tab === it.id;
    const Icon = navIconMap[it.id] || (it.id === "help" ? IconHelp : IconSettings);
    return (
      <motion.button
        key={it.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.1 + index * 0.06 }}
        onClick={() => onNav(it.id)}
        style={{ ...navBtn, ...(active ? navBtnActive : {}) }}
        whileHover={!active ? { x: 3, background: "rgba(255,255,255,0.08)" } : {}}
        whileTap={{ scale: 0.98 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ ...iconWrap, ...(active ? iconWrapActive : {}) }}>
            <Icon />
          </div>
          <span>{it.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {it.badge != null && it.badge > 0 && (
            <span style={{
              ...badgePill,
              background: it.badgeColor || "rgba(249,115,22,0.9)",
              color: "#fff",
              ...(active ? { background: "rgba(255,255,255,0.3)" } : {}),
            }}>
              {it.badge > 999 ? "999+" : it.badge}
            </span>
          )}
          <AnimatePresence>
            {active && (
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                style={{ fontSize: 16, opacity: 0.8 }}
              >
                ›
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.aside
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={sidebar}
    >
      {/* Decorative blobs */}
      <div className="animate-blob" style={backdropA} />
      <div className="animate-blob2" style={backdropB} />
      <div style={dotPattern} />

      {/* Logo */}
      <BrandLogo variant="sidebar" />

      {/* Nav label */}
      <div style={sectionLabel}>Điều hướng</div>

      {/* Navigation */}
      <nav style={navWrap}>
        {menuItems.map((it, index) => renderNavItem(it, index, false))}
      </nav>

      {/* Spacer to push settings + user card to bottom */}
      <div style={{ flex: 1 }} />

      {/* Settings */}
      {systemItems.length > 0 && (
        <nav style={navWrap}>
          {systemItems.map((it, index) => renderNavItem(it, index))}
        </nav>
      )}

      {/* User profile */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{ ...userCard, marginTop: 6 }}
      >
        <div style={avatar}>
          {String(user.display_name || user.username || "AD").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.display_name || user.username}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {user.role === "admin" ? "Quản trị viên" : user.role === "manager" ? "Quản lý" : "Nhân viên kinh doanh"}
            </span>
          </div>
        </div>
        {logout && (
          <button
            onClick={logout}
            style={logoutIconBtn}
            title="Đăng xuất"
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            <IconLogout />
          </button>
        )}
      </motion.div>
    </motion.aside>
  );
}

/* ── Styles ──────────────────────────────────────── */

const sidebar = {
  width: 340, minWidth: 340,
  position: "fixed", top: 0, left: 0, bottom: 0,
  background: "linear-gradient(180deg, #0b1324 0%, #0f1c33 45%, #0b1324 100%)",
  color: "#cbd5e1", padding: "16px 14px",
  display: "flex", flexDirection: "column", gap: 4,
  boxShadow: "8px 0 40px rgba(10,22,40,0.25), 20px 0 60px rgba(10,22,40,0.1)",
  overflow: "hidden", zIndex: 30,
  borderRight: "1px solid rgba(30,41,59,0.5)",
};
const backdropA = {
  position: "absolute", width: 240, height: 240, borderRadius: "50%",
  background: "rgba(249,115,22,0.1)", filter: "blur(50px)",
  top: -90, right: -70, pointerEvents: "none",
};
const backdropB = {
  position: "absolute", width: 240, height: 240, borderRadius: "50%",
  background: "rgba(59,130,246,0.08)", filter: "blur(50px)",
  bottom: -90, left: -70, pointerEvents: "none",
};
const dotPattern = {
  position: "absolute", inset: 0, opacity: 0.2, pointerEvents: "none",
  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
  backgroundSize: "24px 24px",
};
const sectionLabel = {
  position: "relative", zIndex: 1,
  padding: "12px 10px 6px", fontSize: 11, fontWeight: 700,
  letterSpacing: "0.1em", color: "#64748b", textTransform: "uppercase",
};
const navWrap = {
  position: "relative", zIndex: 1,
  display: "flex", flexDirection: "column", gap: 4,
};
const navBtn = {
  border: "1px solid transparent", borderRadius: 12,
  textAlign: "left", background: "transparent",
  color: "#94a3b8", fontWeight: 600, fontSize: 14,
  padding: "12px 12px", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  transition: "all 0.2s ease",
};
const navBtnActive = {
  background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
  color: "#fff",
  boxShadow: "0 4px 20px rgba(234,88,12,0.4)",
};
const iconWrap = {
  width: 32, height: 32, borderRadius: 8,
  display: "grid", placeItems: "center", fontSize: 14,
  transition: "background 0.2s ease",
};
const iconWrapActive = {
  background: "rgba(255,255,255,0.2)",
};
const badgePill = {
  padding: "1px 7px", borderRadius: 999,
  fontSize: 11, fontWeight: 700, minWidth: 20,
  textAlign: "center", lineHeight: "18px",
};
const userCard = {
  position: "relative", zIndex: 1,
  marginTop: "auto",
  border: "1px solid rgba(148,163,184,0.15)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 14, padding: 10,
  display: "flex", alignItems: "center", gap: 10,
  transition: "background 0.2s ease",
};
const avatar = {
  width: 36, height: 36, borderRadius: 12,
  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  color: "#fff", display: "grid", placeItems: "center",
  fontWeight: 800, fontSize: 13, flexShrink: 0,
  boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
};
const logoutIconBtn = {
  border: "none", background: "rgba(255,255,255,0.06)",
  color: "#94a3b8", borderRadius: 8, padding: 6,
  cursor: "pointer", display: "grid", placeItems: "center",
  transition: "all 0.2s ease", flexShrink: 0,
};
