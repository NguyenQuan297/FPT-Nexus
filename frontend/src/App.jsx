import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, setToken } from "./api";
import Login from "./Login.jsx";
import { LEADS_PAGE_SIZE } from "./constants/leadConstants";
import { styles } from "./styles/appStyles";
import { renderEventText } from "./utils/leadUiHelpers";
import NavItem from "./components/common/NavItem";
import ToastStack from "./components/common/ToastStack";
import DashboardTab from "./components/tabs/DashboardTab";
import LeadsTab from "./components/tabs/LeadsTab";
import UsersTab from "./components/tabs/UsersTab";
import ReportsTab from "./components/tabs/ReportsTab";
import SettingsTab from "./components/tabs/SettingsTab";
import SalesHomeTab from "./components/tabs/SalesHomeTab";
import SalesLeadsTab from "./components/tabs/SalesLeadsTab";
import NotificationsTab from "./components/tabs/NotificationsTab";
import SalesPerformanceTab from "./components/tabs/SalesPerformanceTab";

export default function App() {
  const [user, setUser] = useState(null);
  const [boot, setBoot] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [trend7, setTrend7] = useState([]);
  const [contactRate7, setContactRate7] = useState([]);
  const [conversionRate7, setConversionRate7] = useState([]);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [assigned, setAssigned] = useState("");
  const [phone, setPhone] = useState("");
  const [statusMulti, setStatusMulti] = useState([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [uncontactedOnly, setUncontactedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [repY, setRepY] = useState(new Date().getFullYear());
  const [repM, setRepM] = useState(new Date().getMonth() + 1);
  const [worstMinDays, setWorstMinDays] = useState(31);
  const [worstMaxDays, setWorstMaxDays] = useState(35);
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "sale", display_name: "" });
  const [assignPick, setAssignPick] = useState({});
  const [selected, setSelected] = useState({});
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [bulkAction, setBulkAction] = useState("assign_to_user");
  const [bulkAssignUser, setBulkAssignUser] = useState("");
  const [bulkInterest, setBulkInterest] = useState("Quan tâm");
  const [bulkFollowUpAt, setBulkFollowUpAt] = useState("");
  const [bulkApplyFiltered, setBulkApplyFiltered] = useState(false);
  const [bulkOnlyOverdue, setBulkOnlyOverdue] = useState(false);
  const [bulkOnlyUncontacted, setBulkOnlyUncontacted] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [syncMeta, setSyncMeta] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [leadsPage, setLeadsPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [chartProgress, setChartProgress] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      setBoot(false);
      return;
    }
    apiFetch("/api/v1/auth/me")
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setBoot(false));
  }, []);

  const fetchLeadDataset = useCallback(
    async ({
      assignedValue,
      phoneValue,
      overdueOnlyValue,
      uncontactedOnlyValue,
      statusesValue,
      dateFromValue,
      dateToValue,
      pageValue,
    } = {}) => {
      const qBase = new URLSearchParams();
      const assignedFinal = assignedValue ?? assigned;
      const phoneFinal = phoneValue ?? phone;
      const overdueOnlyFinal = overdueOnlyValue ?? overdueOnly;
      const uncontactedOnlyFinal = uncontactedOnlyValue ?? uncontactedOnly;
      const statusesFinal = statusesValue ?? statusMulti;
      const dateFromFinal = dateFromValue ?? dateFrom;
      const dateToFinal = dateToValue ?? dateTo;
      const pageFinal = pageValue ?? leadsPage;
      if (assignedFinal.trim()) qBase.set("assigned_to", assignedFinal.trim());
      if (phoneFinal.trim()) qBase.set("phone", phoneFinal.trim());
      if (overdueOnlyFinal) qBase.set("overdue_only", "true");
      if (uncontactedOnlyFinal) qBase.set("uncontacted_only", "true");
      if (statusesFinal?.length) qBase.set("statuses", statusesFinal.join(","));
      if (dateFromFinal) qBase.set("date_from", dateFromFinal);
      if (dateToFinal) qBase.set("date_to", dateToFinal);
      qBase.set("page", String(pageFinal));
      qBase.set("limit", String(LEADS_PAGE_SIZE));
      return apiFetch(`/api/v1/leads/query?${qBase}`);
    },
    [assigned, phone, overdueOnly, uncontactedOnly, statusMulti, dateFrom, dateTo, leadsPage]
  );

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetchLeadDataset();
      setStats(res.stats || null);
      setLeads(res.items || []);
      setLeadsTotal(res.total || 0);
      setTrend7(res.trend_7d || []);
      setContactRate7(res.contact_rate_7d || []);
      setConversionRate7(res.conversion_rate_7d || []);
    } catch (e) {
      setStats(null);
      setLeads([]);
      setLeadsTotal(0);
      setTrend7([]);
      setContactRate7([]);
      setConversionRate7([]);
      setErr(String(e.message || e));
    }
  }, [fetchLeadDataset]);

  const loadNotifs = useCallback(() => {
    apiFetch("/api/v1/notifications").then(setNotifs).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      setUsers(await apiFetch("/api/v1/users/performance"));
    } catch {
      setUsers(await apiFetch("/api/v1/users"));
    }
  }, [user]);

  const loadAssignees = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      const res = await apiFetch("/api/v1/leads/assignees");
      setAssigneeOptions(res?.items || []);
    } catch {
      setAssigneeOptions([]);
    }
  }, [user]);

  const loadSyncMeta = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      setSyncMeta(await apiFetch("/api/v1/sync/latest"));
    } catch {
      setSyncMeta(null);
    }
  }, [user]);

  const loadReport = useCallback(async () => {
    if (user?.role !== "admin") return;
    setErr(null);
    try {
      const r = await apiFetch(
        `/api/v1/reports/monthly?year=${repY}&month=${repM}&worst_min_days=${worstMinDays}&worst_max_days=${worstMaxDays}`
      );
      setReport(r);
    } catch (x) {
      setErr(String(x.message || x));
    }
  }, [repY, repM, worstMinDays, worstMaxDays, user]);

  useEffect(() => {
    setLeadsPage(1);
  }, [assigned, phone, overdueOnly, uncontactedOnly, statusMulti, dateFrom, dateTo, tab]);

  useEffect(() => {
    if (user?.role === "sale") {
      setTab((t) => (t === "dashboard" || t === "settings" ? "sales-home" : t));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load().catch((e) => setErr(String(e.message || e)));
    loadNotifs();
    if (user.role === "admin") loadSyncMeta();
    const id = setInterval(loadNotifs, 45000);
    return () => clearInterval(id);
  }, [user, load, loadNotifs, loadSyncMeta, leadsPage]);

  useEffect(() => {
    if (tab === "leads" && user?.role === "admin") {
      loadUsers().catch(() => {});
      loadAssignees().catch(() => {});
    }
  }, [tab, user, loadUsers, loadAssignees]);

  useEffect(() => {
    if (tab === "users" && user?.role === "admin") {
      loadUsers().catch(() => {});
      loadAssignees().catch(() => {});
    }
  }, [tab, user, loadUsers, loadAssignees]);

  useEffect(() => {
    if (!user) return;
    const t = getToken();
    if (!t) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/v1/realtime/ws?token=${encodeURIComponent(t)}`);
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type && data.type !== "system.connected" && data.type !== "system.pong") {
          setToasts((prev) => [...prev.slice(-3), { id: Date.now() + Math.random(), text: renderEventText(data) }]);
          load().catch(() => {});
          loadNotifs();
          if (tab === "reports" && user.role === "admin") loadReport();
          if (data.type === "excel_sync.updated" && user.role === "admin") loadSyncMeta();
          if (user.role === "admin" && data.type?.startsWith("lead.")) loadAssignees();
        }
      } catch {
        // noop
      }
    };
    const removeToast = setInterval(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => {
      clearInterval(removeToast);
      ws.close();
    };
  }, [user, tab, load, loadNotifs, loadSyncMeta, loadReport, loadAssignees]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("replace_existing", "true");
    try {
      const res = await apiFetch("/api/v1/upload/excel", { method: "POST", body: fd });
      setAssigned("");
      setPhone("");
      setStatusMulti([]);
      setOverdueOnly(false);
      setDateFrom("");
      setDateTo("");
      setLeadsPage(1);
      let res2 = await fetchLeadDataset({
        assignedValue: "",
        phoneValue: "",
        overdueOnlyValue: false,
        statusesValue: [],
        dateFromValue: "",
        dateToValue: "",
        pageValue: 1,
      });
      if (res?.queued) {
        let stableHits = 0;
        let lastTotal = res2?.total || 0;
        for (let i = 0; i < 20; i++) {
          if ((res2?.total || 0) >= res.queued) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const next = await fetchLeadDataset({
            assignedValue: "",
            phoneValue: "",
            overdueOnlyValue: false,
            statusesValue: [],
            dateFromValue: "",
            dateToValue: "",
            pageValue: 1,
          });
          if ((next?.total || 0) === lastTotal) stableHits += 1;
          else stableHits = 0;
          res2 = next;
          lastTotal = next?.total || 0;
          if (stableHits >= 2 && lastTotal > 0) break;
        }
      }
      setStats(res2.stats || null);
      setLeads(res2.items || []);
      setLeadsTotal(res2.total || 0);
      setTrend7(res2.trend_7d || []);
      setContactRate7(res2.contact_rate_7d || []);
      setConversionRate7(res2.conversion_rate_7d || []);
      loadNotifs();
      if (user?.role === "admin") await loadSyncMeta();
      if (user?.role === "admin") await loadAssignees();
      if (res?.queued != null) {
        setToasts((prev) => [
          ...prev.slice(-3),
          { id: Date.now() + Math.random(), text: `Đã đưa ${res.queued} dòng vào hệ thống. Tổng dữ liệu hiện tại: ${res2?.total || 0}.` },
        ]);
      }
      e.target.value = "";
    } catch (x) {
      setErr(String(x.message || x));
    } finally {
      setUploading(false);
    }
  }

  async function patchUser(userId, payload) {
    setErr(null);
    try {
      const res = await apiFetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res?.leads_reassigned_from_assignee > 0) {
        setToasts((prev) => [
          ...prev.slice(-3),
          {
            id: Date.now() + Math.random(),
            text: `Đã gộp ${res.leads_reassigned_from_assignee} lead từ nhãn Excel sang tài khoản này.`,
          },
        ]);
      }
      await loadUsers();
      await loadAssignees();
    } catch (x) {
      setErr(String(x.message || x));
      throw x;
    }
  }

  async function createUser(e) {
    e.preventDefault();
    setErr(null);
    try {
      const body = { username: newUser.username, password: newUser.password, role: "sale" };
      if (newUser.display_name && String(newUser.display_name).trim()) {
        body.display_name = String(newUser.display_name).trim();
      }
      await apiFetch("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewUser({ username: "", password: "", role: "sale", display_name: "" });
      await loadUsers();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function doAssign(leadId) {
    const username = assignPick[leadId];
    if (!username) return;
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}/assign`, { method: "PATCH", body: JSON.stringify({ username }) });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function markContacted(leadId) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ mark_contacted: true }) });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function saveNotes(leadId, notes) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ notes }) });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function appendNote(leadId, text) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ append_note: text }),
      });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function updateLeadStatus(leadId, status) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  const applySalesPreset = useCallback((preset) => {
    setLeadsPage(1);
    if (preset === "all") {
      setOverdueOnly(false);
      setUncontactedOnly(false);
    } else if (preset === "uncontacted") {
      setOverdueOnly(false);
      setUncontactedOnly(true);
    } else if (preset === "overdue") {
      setOverdueOnly(true);
      setUncontactedOnly(false);
    }
  }, []);

  function buildBulkFilters() {
    return {
      assigned_to: assigned.trim() || null,
      phone: phone.trim() || null,
      overdue_only: overdueOnly,
      statuses: statusMulti,
      date_from: dateFrom ? `${dateFrom}T00:00:00Z` : null,
      date_to: dateTo ? `${dateTo}T23:59:59Z` : null,
      uncontacted_only: bulkOnlyUncontacted,
    };
  }

  async function runBulkAction() {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length && !bulkApplyFiltered) return;
    setErr(null);
    setBulkWorking(true);
    try {
      if (bulkAction === "export_selected_csv") {
        const r = await fetch("/api/v1/leads/bulk-export", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lead_ids: ids,
            apply_filtered: bulkApplyFiltered,
            filters: buildBulkFilters(),
            only_overdue: bulkOnlyOverdue,
            action: "export_selected_csv",
          }),
        });
        if (!r.ok) throw new Error(await r.text());
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "selected_leads_export.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const payload = {
          lead_ids: ids,
          apply_filtered: bulkApplyFiltered,
          filters: buildBulkFilters(),
          action: bulkAction,
          username: bulkAssignUser || null,
          only_overdue: bulkOnlyOverdue,
          interest_level: bulkInterest || null,
          follow_up_at: bulkFollowUpAt ? new Date(bulkFollowUpAt).toISOString() : null,
        };
        const res = await apiFetch("/api/v1/leads/bulk-actions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToasts((prev) => [...prev.slice(-3), { id: Date.now() + Math.random(), text: res.message || "Đã chạy bulk action." }]);
      }
      setSelected({});
      await load();
      loadNotifs();
    } catch (x) {
      setErr(String(x.message || x));
    } finally {
      setBulkWorking(false);
    }
  }

  async function runExcelSync() {
    if (user?.role !== "admin") return;
    setErr(null);
    try {
      await apiFetch("/api/v1/sync/run", { method: "POST" });
      await loadSyncMeta();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function downloadReportExport() {
    const r = await fetch(
      `/api/v1/reports/monthly/export?year=${repY}&month=${repM}&worst_min_days=${worstMinDays}&worst_max_days=${worstMaxDays}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    );
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly_report_${repY}_${String(repM).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadLeadsExport() {
    const r = await fetch("/api/v1/leads/export", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadLatestSync() {
    const r = await fetch("/api/v1/sync/latest/download", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads_latest.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    if (user?.role === "admin") {
      try {
        await apiFetch("/api/v1/system/reset-operational-data", { method: "POST", timeoutMs: 40000 });
      } catch {
        // continue local logout flow
      }
    }
    setToken(null);
    setUser(null);
    setStats(null);
    setLeads([]);
    setLeadsTotal(0);
    setTrend7([]);
    setContactRate7([]);
    setConversionRate7([]);
    setNotifs([]);
    setReport(null);
    setUsers([]);
    setAssigneeOptions([]);
    setSelected({});
    setAssignPick({});
    setActiveLeadId(null);
  }

  function toggleStatus(s) {
    setStatusMulti((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleSelect(id, checked) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  function toggleSelectAllCurrentPage(checked) {
    const ids = leads.map((x) => x.id);
    setSelected((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  }

  async function selectAllByCurrentFilter() {
    setErr(null);
    try {
      const qBase = new URLSearchParams();
      if (assigned.trim()) qBase.set("assigned_to", assigned.trim());
      if (phone.trim()) qBase.set("phone", phone.trim());
      if (overdueOnly) qBase.set("overdue_only", "true");
      if (bulkOnlyUncontacted) qBase.set("uncontacted_only", "true");
      if (statusMulti?.length) qBase.set("statuses", statusMulti.join(","));
      if (dateFrom) qBase.set("date_from", dateFrom);
      if (dateTo) qBase.set("date_to", dateTo);
      const res = await apiFetch(`/api/v1/leads/query-ids?${qBase}`);
      const ids = res?.ids || [];
      const map = {};
      ids.forEach((id) => {
        map[id] = true;
      });
      setSelected(map);
      setToasts((prev) => [...prev.slice(-3), { id: Date.now() + Math.random(), text: `Đã chọn toàn bộ ${ids.length} lead theo bộ lọc.` }]);
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  function commitPageInput() {
    const raw = pageInput.trim();
    if (!raw) {
      setPageInput(String(leadsPage));
      return;
    }
    const v = Number(raw);
    if (Number.isNaN(v)) {
      setPageInput(String(leadsPage));
      return;
    }
    setLeadsPage(Math.max(1, Math.min(totalLeadPages, Math.trunc(v))));
  }

  const activeLead = useMemo(() => leads.find((x) => x.id === activeLeadId) || null, [leads, activeLeadId]);
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const currentPageIds = useMemo(() => leads.map((x) => x.id), [leads]);
  const currentPageAllSelected = currentPageIds.length > 0 && currentPageIds.every((id) => !!selected[id]);
  const totalLeadPages = Math.max(1, Math.ceil(leadsTotal / LEADS_PAGE_SIZE));
  const unread = notifs.filter((n) => !n.read_at).length;
  const overdueCount = stats?.overdue ?? 0;
  const contactedToday = stats?.contacted_today ?? 0;
  const totalLeads = stats?.total_leads ?? leadsTotal;
  const uncontacted = stats?.uncontacted ?? 0;
  const slaCompliance = totalLeads ? Math.max(0, ((totalLeads - overdueCount) / totalLeads) * 100) : 100;

  useEffect(() => {
    if (leadsPage > totalLeadPages) setLeadsPage(totalLeadPages);
  }, [leadsPage, totalLeadPages]);

  useEffect(() => {
    setPageInput(String(leadsPage));
  }, [leadsPage]);

  useEffect(() => {
    if (tab !== "dashboard" && tab !== "sales-home" && tab !== "sales-performance") return;
    setChartProgress(0);
    const id = window.setTimeout(() => setChartProgress(1), 40);
    return () => window.clearTimeout(id);
  }, [tab, totalLeads, uncontacted, overdueCount, contactedToday, trend7]);

  if (boot) return <div style={{ padding: 24 }}>Đang tải...</div>;
  if (!user) return <Login onLoggedIn={setUser} />;

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <h2 style={{ marginTop: 0 }}>{user.role === "sale" ? "Sales" : "Quản lý Lead"}</h2>
        {user.role === "sale" && user.display_name ? (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#94a3b8", lineHeight: 1.35 }}>{user.display_name}</p>
        ) : null}
        {user.role === "sale" ? (
          <>
            <NavItem active={tab === "sales-home"} onClick={() => setTab("sales-home")} label="Trang chủ" />
            <NavItem active={tab === "sales-leads"} onClick={() => setTab("sales-leads")} label="My Leads" />
            <NavItem
              active={tab === "notifications"}
              onClick={() => {
                setTab("notifications");
                loadNotifs();
              }}
              label="Thông báo"
            />
            <NavItem active={tab === "sales-performance"} onClick={() => setTab("sales-performance")} label="Hiệu suất" />
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
              <NavItem active={tab === "reports"} onClick={() => { setTab("reports"); loadReport(); }} label="Báo cáo" />
            )}
            <NavItem active={tab === "settings"} onClick={() => setTab("settings")} label="Cài đặt" />
          </>
        )}
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <span style={styles.badge}>🔔 {unread}</span>
          <span style={{ ...styles.badge, color: overdueCount ? "#b91c1c" : "#475569" }}>⚠ {overdueCount} quá hạn</span>
          {user.role === "admin" && (
            <label style={styles.btnPrimary}>
              {uploading ? "Đang tải lên..." : "Tải lên Excel"}
              <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onUpload} disabled={uploading} />
            </label>
          )}
          <button style={styles.btnGhost} onClick={() => logout()}>Đăng xuất</button>
        </header>

        {err && <div style={styles.error}>{err}</div>}
        {user.role === "admin" && totalLeads === 0 && !uploading && (
          <div style={styles.banner}>
            Vui lòng tải file Excel để hiển thị dữ liệu cho phiên đăng nhập này.
          </div>
        )}
        <ToastStack toasts={toasts} />

        {user.role === "sale" && tab === "sales-home" && (
          <SalesHomeTab
            stats={stats}
            trend7={trend7}
            contactRate7={contactRate7}
            conversionRate7={conversionRate7}
            chartProgress={chartProgress}
            onOpenMyLeads={() => {
              applySalesPreset("all");
              setTab("sales-leads");
            }}
            onOpenOverdueLeads={() => {
              applySalesPreset("overdue");
              setTab("sales-leads");
            }}
          />
        )}

        {user.role === "sale" && tab === "sales-leads" && (
          <SalesLeadsTab
            visibleLeads={leads}
            activeLead={activeLead}
            setActiveLeadId={setActiveLeadId}
            phone={phone}
            setPhone={setPhone}
            overdueOnly={overdueOnly}
            setOverdueOnly={setOverdueOnly}
            uncontactedOnly={uncontactedOnly}
            setUncontactedOnly={setUncontactedOnly}
            onApplyFilters={() => load()}
            markContacted={markContacted}
            appendNote={appendNote}
            updateLeadStatus={updateLeadStatus}
            saveNotes={saveNotes}
            leadsPage={leadsPage}
            totalLeadPages={totalLeadPages}
            setLeadsPage={setLeadsPage}
            leadsTotal={leadsTotal}
            applySalesPreset={applySalesPreset}
          />
        )}

        {user.role === "sale" && tab === "notifications" && (
          <NotificationsTab notifs={notifs} loadNotifs={loadNotifs} setErr={setErr} />
        )}

        {user.role === "sale" && tab === "sales-performance" && (
          <SalesPerformanceTab
            stats={stats}
            trend7={trend7}
            contactRate7={contactRate7}
            conversionRate7={conversionRate7}
            chartProgress={chartProgress}
          />
        )}

        {tab === "dashboard" && user.role === "admin" && (
          <DashboardTab
            user={user}
            totalLeads={totalLeads}
            uncontacted={uncontacted}
            overdueCount={overdueCount}
            contactedToday={contactedToday}
            slaCompliance={slaCompliance}
            visibleStats={stats}
            trend7={trend7}
            contactRate7={contactRate7}
            conversionRate7={conversionRate7}
            chartProgress={chartProgress}
            onOpenLeads={() => {
              setTab("leads");
              setOverdueOnly(false);
              load();
            }}
          />
        )}

        {tab === "leads" && user.role === "admin" && (
          <LeadsTab
            user={user}
            assigned={assigned}
            setAssigned={setAssigned}
            phone={phone}
            setPhone={setPhone}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            overdueOnly={overdueOnly}
            setOverdueOnly={setOverdueOnly}
            statusMulti={statusMulti}
            toggleStatus={toggleStatus}
            onApplyFilters={() => load()}
            selected={selected}
            selectedCount={selectedCount}
            currentPageAllSelected={currentPageAllSelected}
            onToggleSelectAllCurrentPage={toggleSelectAllCurrentPage}
            onSelectAllButton={selectAllByCurrentFilter}
            bulkAction={bulkAction}
            setBulkAction={setBulkAction}
            bulkAssignUser={bulkAssignUser}
            setBulkAssignUser={setBulkAssignUser}
            bulkInterest={bulkInterest}
            setBulkInterest={setBulkInterest}
            bulkFollowUpAt={bulkFollowUpAt}
            setBulkFollowUpAt={setBulkFollowUpAt}
            bulkApplyFiltered={bulkApplyFiltered}
            setBulkApplyFiltered={setBulkApplyFiltered}
            bulkOnlyOverdue={bulkOnlyOverdue}
            setBulkOnlyOverdue={setBulkOnlyOverdue}
            bulkOnlyUncontacted={bulkOnlyUncontacted}
            setBulkOnlyUncontacted={setBulkOnlyUncontacted}
            bulkWorking={bulkWorking}
            onRunBulkAction={runBulkAction}
            onClearSelection={() => setSelected({})}
            assigneeOptions={assigneeOptions}
            visibleLeads={leads}
            setActiveLeadId={setActiveLeadId}
            toggleSelect={toggleSelect}
            markContacted={markContacted}
            assignPick={assignPick}
            setAssignPick={setAssignPick}
            doAssign={doAssign}
            leadsPage={leadsPage}
            totalLeadPages={totalLeadPages}
            pageInput={pageInput}
            setPageInput={setPageInput}
            commitPageInput={commitPageInput}
            setLeadsPage={setLeadsPage}
            leadsTotal={leadsTotal}
            activeLead={activeLead}
            saveNotes={saveNotes}
          />
        )}

        {tab === "users" && user.role === "admin" && (
          <UsersTab
            newUser={newUser}
            setNewUser={setNewUser}
            createUser={createUser}
            users={users}
            assigneeOptions={assigneeOptions}
            patchUser={patchUser}
          />
        )}

        {tab === "reports" && user.role === "admin" && (
          <ReportsTab
            repY={repY}
            setRepY={setRepY}
            repM={repM}
            setRepM={setRepM}
            worstMinDays={worstMinDays}
            setWorstMinDays={setWorstMinDays}
            worstMaxDays={worstMaxDays}
            setWorstMaxDays={setWorstMaxDays}
            loadReport={loadReport}
            downloadReportExport={downloadReportExport}
            setErr={setErr}
            report={report}
          />
        )}

        {tab === "settings" && user.role === "admin" && (
          <SettingsTab
            user={user}
            syncMeta={syncMeta}
            runExcelSync={runExcelSync}
            downloadLatestSync={downloadLatestSync}
            setErr={setErr}
          />
        )}
      </main>
    </div>
  );
}
