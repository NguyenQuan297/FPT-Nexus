import { motion } from "motion/react";
import Login from "./Login.jsx";
import { styles } from "./styles/appStyles";
import { useDashboardApp } from "./hooks/useDashboardApp";
import AppSidebar from "./components/layout/AppSidebar";
import AppTopBar from "./components/layout/AppTopBar";
import DashboardTabRoutes from "./components/layout/DashboardTabRoutes";

/** Root layout: auth gate, shell, tab content from `useDashboardApp`. */
export default function App() {
  const app = useDashboardApp();
  const { user, setUser, boot, loadUsers, loadAssignees, loadReport } = app;

  if (boot)
    return (
      <div style={loadingScreen}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{ textAlign: "center" }}
        >
          <div style={loadingSpinner} />
          <p style={{ marginTop: 16, color: "#64748b", fontSize: 14, fontWeight: 600 }}>Đang tải...</p>
        </motion.div>
      </div>
    );

  if (!user) return <Login onLoggedIn={setUser} />;

  return (
    <div style={styles.shell}>
      <AppSidebar
        user={user}
        tab={app.tab}
        setTab={app.setTab}
        loadUsers={loadUsers}
        loadAssignees={loadAssignees}
        loadReport={loadReport}
        totalLeads={app.totalLeads}
        logout={app.logout}
      />
      <main style={styles.main}>
        <AppTopBar
          user={user}
          tab={app.tab}
          roleLabel={app.roleLabel}
          unread={app.unread}
          setTab={app.setTab}
          loadNotifs={app.loadNotifs}
          setErr={app.setErr}
          notifs={app.notifs}
          logout={app.logout}
        />
        <DashboardTabRoutes app={app} />
      </main>
    </div>
  );
}

const loadingScreen = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "#f8fafc",
};
const loadingSpinner = {
  width: 36,
  height: 36,
  border: "3px solid #e2e8f0",
  borderTopColor: "#f97316",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  margin: "0 auto",
};
