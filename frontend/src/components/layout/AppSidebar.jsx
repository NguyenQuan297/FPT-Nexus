import NavItem from "../common/NavItem";
import BrandLogo from "../common/BrandLogo";
import { styles } from "../../styles/appStyles";

/**
 * Thanh điều hướng trái: logo, menu khác nhau cho admin vs sale.
 */
export default function AppSidebar({ user, tab, setTab, loadUsers, loadAssignees, loadReport }) {
  return (
    <aside style={styles.sidebar}>
      <BrandLogo variant="sidebar" />
      {user.role === "sale" && user.display_name ? (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", lineHeight: 1.35 }}>{user.display_name}</p>
      ) : null}
      {user.role === "sale" ? (
        <>
          <NavItem active={tab === "sales-home"} onClick={() => setTab("sales-home")} label="Trang chủ" />
          <NavItem active={tab === "sales-leads"} onClick={() => setTab("sales-leads")} label="Leads của tôi" />
          <NavItem active={tab === "notifications"} onClick={() => setTab("notifications")} label="Thông báo" />
        </>
      ) : (
        <>
          <NavItem active={tab === "dashboard"} onClick={() => setTab("dashboard")} label="Tổng quan" />
          <NavItem active={tab === "leads"} onClick={() => setTab("leads")} label="Danh sách lead" />
          {user.role === "admin" && (
            <NavItem
              active={tab === "users"}
              onClick={() => {
                setTab("users");
                loadUsers();
                loadAssignees();
              }}
              label="Người dùng"
            />
          )}
          {user.role === "admin" && (
            <NavItem
              active={tab === "reports"}
              onClick={() => {
                setTab("reports");
                loadReport();
              }}
              label="Báo cáo"
            />
          )}
          <NavItem active={tab === "settings"} onClick={() => setTab("settings")} label="Cài đặt" />
        </>
      )}
    </aside>
  );
}
