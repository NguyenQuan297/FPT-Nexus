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

  if (boot) return <div style={{ padding: 24 }}>Đang tải...</div>;
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
      />
      <main style={styles.main}>
        <AppTopBar
          user={user}
          roleLabel={app.roleLabel}
          nowLabel={app.nowLabel}
          unread={app.unread}
          overdueCount={app.overdueCount}
          uploading={app.uploading}
          onUpload={app.onUpload}
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
