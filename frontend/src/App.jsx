import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, setToken } from "./api";
import Login from "./Login.jsx";

const STATUS_OPTIONS = ["new", "contacting", "active", "late", "closed"];
const LEADS_PAGE_SIZE = 20;

export default function App() {
  const [user, setUser] = useState(null);
  const [boot, setBoot] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [trend7, setTrend7] = useState([]);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [assigned, setAssigned] = useState("");
  const [phone, setPhone] = useState("");
  const [statusMulti, setStatusMulti] = useState([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
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
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "sale" });
  const [assignPick, setAssignPick] = useState({});
  const [selected, setSelected] = useState({});
  const [bulkUser, setBulkUser] = useState("");
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
      .then((u) => {
        setUser(u);
      })
      .catch(() => setUser(null))
      .finally(() => setBoot(false));
  }, []);

  const fetchLeadDataset = useCallback(async ({ assignedValue, phoneValue, overdueOnlyValue, statusesValue, dateFromValue, dateToValue, pageValue } = {}) => {
    const qBase = new URLSearchParams();
    const assignedFinal = assignedValue ?? assigned;
    const phoneFinal = phoneValue ?? phone;
    const overdueOnlyFinal = overdueOnlyValue ?? overdueOnly;
    const statusesFinal = statusesValue ?? statusMulti;
    const dateFromFinal = dateFromValue ?? dateFrom;
    const dateToFinal = dateToValue ?? dateTo;
    const pageFinal = pageValue ?? leadsPage;
    if (assignedFinal.trim()) qBase.set("assigned_to", assignedFinal.trim());
    if (phoneFinal.trim()) qBase.set("phone", phoneFinal.trim());
    if (overdueOnlyFinal) qBase.set("overdue_only", "true");
    if (statusesFinal?.length) qBase.set("statuses", statusesFinal.join(","));
    if (dateFromFinal) qBase.set("date_from", dateFromFinal);
    if (dateToFinal) qBase.set("date_to", dateToFinal);
    qBase.set("page", String(pageFinal));
    qBase.set("limit", String(LEADS_PAGE_SIZE));
    return apiFetch(`/api/v1/leads/query?${qBase}`);
  }, [assigned, phone, overdueOnly, statusMulti, dateFrom, dateTo, leadsPage]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetchLeadDataset();
      setStats(res.stats || null);
      setLeads(res.items || []);
      setLeadsTotal(res.total || 0);
      setTrend7(res.trend_7d || []);
    } catch (e) {
      setStats(null);
      setLeads([]);
      setLeadsTotal(0);
      setTrend7([]);
      setErr(String(e.message || e));
    }
  }, [fetchLeadDataset]);

  useEffect(() => {
    setLeadsPage(1);
  }, [assigned, phone, overdueOnly, statusMulti, dateFrom, dateTo, tab]);

  const loadNotifs = useCallback(() => {
    apiFetch("/api/v1/notifications").then(setNotifs).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    if (user?.role !== "admin") return;
    setUsers(await apiFetch("/api/v1/users"));
  }, [user]);

  const loadSyncMeta = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      setSyncMeta(await apiFetch("/api/v1/sync/latest"));
    } catch {
      setSyncMeta(null);
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
    if (!user) return;
    const t = getToken();
    if (!t) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/v1/realtime/ws?token=${encodeURIComponent(t)}`);
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type && data.type !== "system.connected" && data.type !== "system.pong") {
          setToasts((prev) => [
            ...prev.slice(-3),
            { id: Date.now() + Math.random(), text: renderEventText(data) },
          ]);
          load().catch(() => {});
          loadNotifs();
          if (tab === "reports" && user.role === "admin") loadReport();
          if (data.type === "excel_sync.updated" && user.role === "admin") {
            loadSyncMeta();
          }
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
  }, [user, tab, load, loadNotifs, loadSyncMeta]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    // Replace mode: each upload becomes the active working dataset.
    fd.append("replace_existing", "true");
    try {
      const res = await apiFetch("/api/v1/upload/excel", { method: "POST", body: fd });
      // Show full dataset after upload (avoid stale filter confusion).
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
        // Worker persists rows asynchronously; poll briefly so UI reflects the real imported total.
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
      loadNotifs();
      if (user?.role === "admin") await loadSyncMeta();
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

  async function loadReport() {
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
  }

  async function createUser(e) {
    e.preventDefault();
    setErr(null);
    try {
      await apiFetch("/api/v1/users", {
        method: "POST",
        body: JSON.stringify({ username: newUser.username, password: newUser.password, role: "sale" }),
      });
      setNewUser({ username: "", password: "", role: "sale" });
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
      await apiFetch(`/api/v1/leads/${leadId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ username }),
      });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function markContacted(leadId) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ mark_contacted: true }),
      });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function saveNotes(leadId, notes) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      await load();
    } catch (x) {
      setErr(String(x.message || x));
    }
  }

  async function doBulkAssign() {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length || !bulkUser.trim()) return;
    setErr(null);
    try {
      await apiFetch("/api/v1/leads/bulk-assign", {
        method: "POST",
        body: JSON.stringify({ lead_ids: ids, username: bulkUser.trim() }),
      });
      setSelected({});
      await load();
      loadNotifs();
    } catch (x) {
      setErr(String(x.message || x));
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
    const r = await fetch("/api/v1/leads/export", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
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
    const r = await fetch("/api/v1/sync/latest/download", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
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
    // Admin logout resets operational data so next login starts clean.
    if (user?.role === "admin") {
      try {
        await apiFetch("/api/v1/system/reset-operational-data", { method: "POST", timeoutMs: 40000 });
      } catch {
        // Continue local logout even if reset endpoint fails.
      }
    }
    setToken(null);
    setUser(null);
    setStats(null);
    setLeads([]);
    setLeadsTotal(0);
    setTrend7([]);
    setNotifs([]);
    setReport(null);
    setUsers([]);
    setSelected({});
    setAssignPick({});
    setBulkUser("");
    setActiveLeadId(null);
  }

  function toggleStatus(s) {
    setStatusMulti((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleSelect(id, checked) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  const visibleLeads = leads;
  const visibleStats = stats;

  const activeLead = useMemo(
    () => visibleLeads.find((x) => x.id === activeLeadId) || null,
    [visibleLeads, activeLeadId]
  );
  const totalLeadPages = Math.max(1, Math.ceil(leadsTotal / LEADS_PAGE_SIZE));
  useEffect(() => {
    if (leadsPage > totalLeadPages) setLeadsPage(totalLeadPages);
  }, [leadsPage, totalLeadPages]);
  useEffect(() => {
    setPageInput(String(leadsPage));
  }, [leadsPage]);

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
  const unread = notifs.filter((n) => !n.read_at).length;
  const overdueCount = visibleStats?.overdue ?? 0;
  const contactedToday = visibleStats?.contacted_today ?? 0;
  const totalLeads = visibleStats?.total_leads ?? leadsTotal;
  const uncontacted = visibleStats?.uncontacted ?? 0;
  const slaCompliance = totalLeads ? Math.max(0, ((totalLeads - overdueCount) / totalLeads) * 100) : 100;

  useEffect(() => {
    if (tab !== "dashboard") return;
    setChartProgress(0);
    const id = window.setTimeout(() => setChartProgress(1), 40);
    return () => window.clearTimeout(id);
  }, [tab, totalLeads, uncontacted, overdueCount, contactedToday, trend7]);

  if (boot) return <div style={{ padding: 24 }}>Đang tải...</div>;
  if (!user) return <Login onLoggedIn={setUser} />;

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <h2 style={{ marginTop: 0 }}>Quản lý Lead</h2>
        <NavItem active={tab === "dashboard"} onClick={() => setTab("dashboard")} label="Tổng quan" />
        <NavItem active={tab === "leads"} onClick={() => setTab("leads")} label="Danh sách lead" />
        {user.role === "admin" && <NavItem active={tab === "users"} onClick={() => { setTab("users"); loadUsers(); }} label="Người dùng" />}
        {user.role === "admin" && <NavItem active={tab === "reports"} onClick={() => { setTab("reports"); loadReport(); }} label="Báo cáo" />}
        <NavItem active={tab === "settings"} onClick={() => setTab("settings")} label="Cài đặt" />
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

        {tab === "dashboard" && (
          <>
            <section style={styles.kpiGrid}>
              <Kpi title="Tổng số lead" value={totalLeads} tone="slate" />
              <Kpi title="Chưa liên hệ" value={uncontacted} tone="amber" />
              <Kpi title="Quá hạn SLA" value={overdueCount} tone="red" />
              <Kpi title="Đã liên hệ hôm nay" value={contactedToday} tone="green" />
              <Kpi title="Tỷ lệ đạt SLA" value={`${slaCompliance.toFixed(1)}%`} tone="blue" />
              {user.role === "admin" && visibleStats?.daily_misses_today != null && (
                <Kpi title="Số lead trễ hôm nay (UTC)" value={visibleStats.daily_misses_today} tone="rose" />
              )}
            </section>

            {overdueCount > 0 && (
              <div style={styles.banner}>
                Cảnh báo: {overdueCount} lead đang quá hạn SLA.{" "}
                <button style={styles.linkBtn} onClick={() => { setTab("leads"); setOverdueOnly(false); load(); }}>
                  Xem danh sách
                </button>
              </div>
            )}

            <section style={styles.card}>
              <h3>Xu hướng 7 ngày gần nhất</h3>
              <div style={styles.dashboardCharts}>
                <ChartCard title="Tần suất lead theo ngày">
                  <BarFrequencyChart data={trend7} progress={chartProgress} />
                </ChartCard>
                <ChartCard title="Biểu đồ đường 7 ngày">
                  <LineTrendChart data={trend7} progress={chartProgress} />
                </ChartCard>
                <ChartCard title="Phân bổ tình trạng lead">
                  <PieStatusChart
                    total={totalLeads}
                    contacted={Math.max(0, totalLeads - uncontacted)}
                    overdue={overdueCount}
                    waiting={Math.max(0, uncontacted - overdueCount)}
                    progress={chartProgress}
                  />
                </ChartCard>
              </div>
            </section>
          </>
        )}

        {tab === "leads" && (
          <div style={styles.split}>
            <section style={{ ...styles.card, flex: 2 }}>
              <h3>Danh sách lead</h3>
              <div style={styles.filters}>
                {user.role === "admin" && (
                  <input style={styles.input} value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Người phụ trách" />
                )}
                <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tìm số điện thoại" />
                <input type="date" style={styles.input} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <input type="date" style={styles.input} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                <label style={styles.chk}><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Chỉ xem lead quá hạn</label>
                <button style={styles.btn} onClick={() => load()}>Áp dụng</button>
              </div>
              {overdueOnly && (
                <small style={{ color: "#b91c1c", display: "block", marginBottom: 8 }}>
                  Đang bật bộ lọc: chỉ hiển thị lead quá hạn.
                </small>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {STATUS_OPTIONS.map((s) => (
                  <label key={s} style={styles.chk}><input type="checkbox" checked={statusMulti.includes(s)} onChange={() => toggleStatus(s)} /> {s}</label>
                ))}
              </div>

              {user.role === "admin" && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input style={styles.input} placeholder="Gán lead đã chọn cho user" value={bulkUser} onChange={(e) => setBulkUser(e.target.value)} />
                  <button style={styles.btn} onClick={doBulkAssign}>Gán hàng loạt ({Object.values(selected).filter(Boolean).length})</button>
                </div>
              )}

              <div style={styles.tableScroll}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {user.role === "admin" && <th style={styles.th}> </th>}
                      <th style={styles.th}>Ngày tạo</th>
                      <th style={styles.th}>Mã KH</th>
                      <th style={styles.th}>Tên học sinh</th>
                      <th style={styles.th}>Trạng thái</th>
                      <th style={styles.th}>Người phụ trách</th>
                      <th style={styles.th}>Lần liên hệ cuối</th>
                      <th style={styles.th}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLeads.map((L) => (
                      <tr key={L.id} style={rowStyle(L)} onClick={() => setActiveLeadId(L.id)}>
                        {user.role === "admin" && (
                          <td style={styles.td}>
                            <input type="checkbox" checked={!!selected[L.id]} onChange={(e) => toggleSelect(L.id, e.target.checked)} />
                          </td>
                        )}
                        <td style={styles.td}>{formatDt(L.created_at)}</td>
                        <td style={styles.td}>{L.external_id || "-"}</td>
                        <td style={styles.td}>{L.name || "-"}</td>
                        <td style={styles.td}><span style={badge(L.status)}>{statusLabel(L.status)}</span></td>
                        <td style={styles.td}>{L.assigned_to || "-"}</td>
                        <td style={styles.td}>{L.last_contact_at ? formatDt(L.last_contact_at) : "-"}</td>
                        <td style={styles.td}>
                          <button style={styles.btnSm} onClick={(e) => { e.stopPropagation(); markContacted(L.id); }}>Đã liên hệ</button>
                          {user.role === "admin" && (
                            <>
                              <input
                                style={{ ...styles.input, minWidth: 110, marginLeft: 6, padding: "4px 6px" }}
                                placeholder="Đổi người phụ trách"
                                value={assignPick[L.id] || ""}
                                onChange={(e) => setAssignPick((p) => ({ ...p, [L.id]: e.target.value }))}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button style={styles.btnSm} onClick={(e) => { e.stopPropagation(); doAssign(L.id); }}>Gán</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <small style={{ color: "#64748b" }}>
                  Hiển thị {(leadsPage - 1) * LEADS_PAGE_SIZE + (visibleLeads.length ? 1 : 0)}-
                  {(leadsPage - 1) * LEADS_PAGE_SIZE + visibleLeads.length} / {leadsTotal}
                </small>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    style={styles.btnGhost}
                    disabled={leadsPage <= 1}
                    onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <span style={{ fontSize: 13, color: "#475569" }}>
                    Trang {leadsPage}/{totalLeadPages}
                  </span>
                  <label style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                    Đến trang
                    <input
                      type="number"
                      min={1}
                      max={totalLeadPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onBlur={commitPageInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitPageInput();
                        }
                      }}
                      style={{ ...styles.input, minWidth: 72, width: 72, padding: "6px 8px" }}
                    />
                  </label>
                  <button
                    style={styles.btnGhost}
                    disabled={leadsPage >= totalLeadPages}
                    onClick={() => setLeadsPage((p) => Math.min(totalLeadPages, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </section>

            <section style={{ ...styles.card, flex: 1, minWidth: 260 }}>
              <h3>Chi tiết lead</h3>
              {!activeLead && <p style={{ color: "#64748b" }}>Chọn một lead để xem chi tiết và lịch sử xử lý.</p>}
              {activeLead && (
                <>
                  <p><strong>{activeLead.name || "-"}</strong></p>
                  <p>Mã KH: {activeLead.external_id || "-"}</p>
                  <p>Số điện thoại: {activeLead.phone || "-"}</p>
                  <p>Trạng thái: <span style={badge(activeLead.status)}>{statusLabel(activeLead.status)}</span></p>
                  <p>Người phụ trách: {activeLead.assigned_to || "-"}</p>
                  <p>Ngày tạo: {formatDt(activeLead.created_at)}</p>
                  <p style={{ marginBottom: 6, fontWeight: 600 }}>Trao đổi gần nhất</p>
                  <textarea
                    key={`${activeLead.id}-${activeLead.notes || ""}`}
                    defaultValue={activeLead.notes || ""}
                    rows={4}
                    style={{ ...styles.input, width: "100%" }}
                    onBlur={(e) => {
                      if (e.target.value !== (activeLead.notes || "")) saveNotes(activeLead.id, e.target.value);
                    }}
                  />
                  {activeLead.extra && (
                    <>
                      <h4>Thông tin bổ sung</h4>
                      <ul style={{ paddingLeft: 16, color: "#475569" }}>
                        {Object.entries(activeLead.extra)
                          .filter(([k]) => !["Trao đổi gần nhất", "Mô tả leadform"].includes(k))
                          .map(([k, v]) => (
                            <li key={k}>
                              <strong>{k}:</strong> {String(v || "-")}
                            </li>
                          ))}
                      </ul>
                    </>
                  )}
                  <h4>Lịch sử</h4>
                  <ul style={{ paddingLeft: 16, color: "#475569" }}>
                    <li>Tạo lead: {formatDt(activeLead.created_at)}</li>
                    <li>Gán cho: {activeLead.assigned_to || "-"}</li>
                    <li>Đã liên hệ: {activeLead.last_contact_at ? formatDt(activeLead.last_contact_at) : "Chưa liên hệ"}</li>
                    <li>Quá hạn SLA: {isClientOverdue(activeLead) ? "Có" : "Không"}</li>
                  </ul>
                </>
              )}
            </section>
          </div>
        )}

        {tab === "users" && user.role === "admin" && (
          <section style={styles.card}>
            <h3>Quản lý người dùng</h3>
            <form onSubmit={createUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <input style={styles.input} placeholder="Tên đăng nhập" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
              <input style={styles.input} placeholder="Mật khẩu" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
              <input style={{ ...styles.input, background: "#f8fafc" }} value="sale" disabled />
              <button style={styles.btn}>Tạo mới</button>
            </form>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Tên đăng nhập</th><th style={styles.th}>Vai trò</th><th style={styles.th}>Hoạt động</th></tr></thead>
              <tbody>{users.map((u) => <tr key={u.id}><td style={styles.td}>{u.username}</td><td style={styles.td}>{u.role}</td><td style={styles.td}>{String(u.is_active)}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        {tab === "reports" && user.role === "admin" && (
          <section style={styles.card}>
            <h3>Báo cáo tháng và SLA</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <input type="number" style={styles.input} value={repY} onChange={(e) => setRepY(Number(e.target.value))} />
              <input type="number" style={styles.input} min={1} max={12} value={repM} onChange={(e) => setRepM(Number(e.target.value))} />
              <input type="number" style={styles.input} min={1} max={365} value={worstMinDays} onChange={(e) => setWorstMinDays(Number(e.target.value))} />
              <input type="number" style={styles.input} min={1} max={365} value={worstMaxDays} onChange={(e) => setWorstMaxDays(Number(e.target.value))} />
              <button style={styles.btn} onClick={loadReport}>Tải báo cáo</button>
              <button style={styles.btnGhost} onClick={() => downloadReportExport().catch((e) => setErr(String(e)))}>Xuất CSV</button>
            </div>
            {report && (
              <>
                <p>Tổng lead tạo mới: <strong>{report.total_leads_created}</strong></p>
                <p>Tổng lead trễ: <strong>{report.overdue_leads}</strong> · Tỷ lệ đạt SLA: <strong>{report.sla_compliance_pct}%</strong></p>
                <div style={{ marginBottom: 12 }}>
                  <strong>Lead cần ưu tiên ({worstMinDays}-{worstMaxDays} ngày):</strong>
                  {report.top_priority_leads?.length ? (
                    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                      {report.top_priority_leads.map((lead) => (
                        <li key={lead.id}>
                          {lead.name} {lead.phone ? `- ${lead.phone}` : ""} {lead.assignee ? `(${lead.assignee})` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span> Không có lead phù hợp.</span>
                  )}
                </div>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>Người phụ trách</th><th style={styles.th}>Số lead</th><th style={styles.th}>Số lead trễ</th><th style={styles.th}>Tỷ lệ đạt SLA</th></tr></thead>
                  <tbody>{report.by_sale.map((s) => <tr key={s.assignee}><td style={styles.td}>{s.assignee}</td><td style={styles.td}>{s.total_leads}</td><td style={styles.td}>{s.overdue_leads}</td><td style={styles.td}>{s.sla_compliance_pct.toFixed(1)}%</td></tr>)}</tbody>
                </table>
                <h4 style={{ marginTop: 18 }}>Bảng phân tích tỷ lệ chuyển đổi</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Người phụ trách</th>
                      <th style={styles.th}>Tổng số lead</th>
                      <th style={styles.th}>Số lượng REG</th>
                      <th style={styles.th}>Số lượng NB</th>
                      <th style={styles.th}>Số lượng NE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.conversion_by_assignee.map((r) => (
                      <tr key={r.assignee}>
                        <td style={styles.td}>{r.assignee}</td>
                        <td style={styles.td}>{r.total_leads}</td>
                        <td style={styles.td}>{r.reg_count}</td>
                        <td style={styles.td}>{r.nb_count}</td>
                        <td style={styles.td}>{r.ne_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section style={styles.card}>
            <h3>Cài đặt hệ thống</h3>
            {user.role === "admin" ? (
              <>
                <p>Trạng thái đồng bộ Excel: <strong>{syncMeta?.status || "không rõ"}</strong></p>
                <p>Cập nhật lần cuối: {syncMeta?.last_updated ? formatDt(syncMeta.last_updated) : "-"}</p>
                <p>Tệp hiện tại: {syncMeta?.filename || "-"}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={styles.btn} onClick={runExcelSync}>Đồng bộ ngay</button>
                  <button style={styles.btnGhost} onClick={() => downloadLatestSync().catch((e) => setErr(String(e)))}>
                    Tải file Excel mới nhất
                  </button>
                  <button style={styles.btnGhost} onClick={() => downloadLeadsExport().catch((e) => setErr(String(e)))}>
                    Xuất danh sách lead CSV
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: "#64748b" }}>Bạn không có quyền xem mục cài đặt này.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function renderEventText(evt) {
  const t = evt?.type || "event";
  const p = evt?.payload || {};
  if (t.startsWith("lead.")) return `Cập nhật lead: ${p.name || p.lead_id || "-"}`;
  if (t.startsWith("notification.")) return p.title ? `Thông báo: ${p.title}` : "Có thông báo mới";
  if (t === "excel_sync.updated") return `Đã đồng bộ Excel (${p.row_count || 0} dòng)`;
  return t;
}

function NavItem({ active, onClick, label }) {
  return <button style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }} onClick={onClick}>{label}</button>;
}

function Kpi({ title, value, tone }) {
  return (
    <div style={{ ...styles.kpiCard, borderTop: `3px solid ${toneColor(tone)}` }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      {children}
    </div>
  );
}

function BarFrequencyChart({ data, progress }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={styles.chartBody}>
      <div style={styles.barChartWrap}>
        {data.map((d) => {
          const ratio = d.value / max;
          return (
            <div key={d.day} style={styles.trendCol}>
              <div
                style={{
                  ...styles.trendBar,
                  height: `${12 + ratio * 150 * progress}px`,
                  background: barColor(ratio),
                  transition: "height 700ms ease, background 700ms ease",
                }}
              />
              <small>{d.day}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineTrendChart({ data, progress }) {
  const width = 320;
  const height = 180;
  const padding = 18;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const baseline = height - padding;
  const points = data
    .map((d, i) => {
      const x = padding + i * step;
      const targetY = baseline - ((height - padding * 2) * d.value) / max;
      const y = baseline - (baseline - targetY) * progress;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div style={styles.chartBody}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 190 }}>
        <line x1={padding} y1={baseline} x2={width - padding} y2={baseline} stroke="#cbd5e1" strokeWidth="1" />
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ transition: "all 700ms ease" }}
        />
        {data.map((d, i) => {
          const x = padding + i * step;
          const targetY = baseline - ((height - padding * 2) * d.value) / max;
          const y = baseline - (baseline - targetY) * progress;
          return (
            <g key={d.day}>
              <circle cx={x} cy={y} r={4} fill="#2563eb" opacity={0.3 + progress * 0.7} />
              <text x={x} y={height - 2} textAnchor="middle" fontSize="10" fill="#64748b">
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PieStatusChart({ total, contacted, waiting, overdue, progress }) {
  const parts = [
    { label: "Đã liên hệ", value: contacted, color: "#16a34a" },
    { label: "Chưa liên hệ", value: waiting, color: "#f59e0b" },
    { label: "Quá hạn", value: overdue, color: "#dc2626" },
  ].filter((x) => x.value > 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div style={{ ...styles.chartBody, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <svg viewBox="0 0 160 160" style={{ width: 170, height: 170 }}>
        <g transform="translate(80,80) rotate(-90)">
          <circle r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" />
          {parts.map((part) => {
            const ratio = total ? part.value / total : 0;
            const seg = circumference * ratio * progress;
            const dashArray = `${seg} ${circumference - seg}`;
            const dashOffset = -offset;
            offset += circumference * ratio;
            return (
              <circle
                key={part.label}
                r={radius}
                fill="none"
                stroke={part.color}
                strokeWidth="18"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 700ms ease" }}
              />
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" fontSize="14" fill="#64748b">
          Tổng
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">
          {Math.round(total * progress)}
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        {parts.map((part) => (
          <div key={part.label} style={styles.legendRow}>
            <span style={{ ...styles.legendDot, background: part.color }} />
            <span style={{ flex: 1 }}>{part.label}</span>
            <strong>{Math.round(part.value * progress)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", right: 20, top: 20, zIndex: 40 }}>
      {toasts.map((t) => (
        <div key={t.id} style={styles.toast}>{t.text}</div>
      ))}
    </div>
  );
}

function toneColor(tone) {
  return { slate: "#64748b", amber: "#d97706", red: "#dc2626", green: "#16a34a", blue: "#2563eb", rose: "#e11d48" }[tone] || "#64748b";
}

function barColor(ratio) {
  if (ratio > 0.8) return "#6366f1";
  if (ratio > 0.55) return "#818cf8";
  if (ratio > 0.3) return "#a5b4fc";
  return "#c7d2fe";
}

function badge(status) {
  const base = { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "uppercase" };
  if (status === "late") return { ...base, background: "#fee2e2", color: "#991b1b" };
  if (status === "active") return { ...base, background: "#dcfce7", color: "#166534" };
  if (status === "contacting") return { ...base, background: "#dbeafe", color: "#1e40af" };
  if (status === "closed") return { ...base, background: "#f3f4f6", color: "#374151" };
  return { ...base, background: "#fef3c7", color: "#92400e" };
}

function statusLabel(status) {
  const map = {
    new: "Mới",
    contacting: "Đang liên hệ",
    active: "Đã liên hệ",
    late: "Trễ hạn",
    closed: "Đóng",
  };
  return map[status] || status || "-";
}

function isClientOverdue(lead) {
  if (lead.status === "closed" || lead.last_contact_at) return false;
  const created = new Date(lead.created_at).getTime();
  return (Date.now() - created) / 3600000 > 16;
}

function rowStyle(lead) {
  if (isClientOverdue(lead)) return { background: "#fff1f2", borderLeft: "4px solid #dc2626", cursor: "pointer" };
  if (!lead.last_contact_at && lead.status !== "closed") return { background: "#fffbeb", cursor: "pointer" };
  if (lead.last_contact_at) return { background: "#f0fdf4", cursor: "pointer" };
  return { cursor: "pointer" };
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildTrend7(leads) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const value = leads.filter((L) => sameDate(new Date(L.created_at), d)).length;
    out.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, value });
  }
  return out;
}

function formatDt(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const styles = {
  shell: { display: "flex", minHeight: "100vh", background: "#f1f5f9" },
  sidebar: { width: 220, background: "#0f172a", color: "#e2e8f0", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  navItem: { textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 600 },
  navItemActive: { background: "#1e293b", color: "#fff" },
  main: { flex: 1, padding: 18 },
  topbar: { background: "#fff", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 12 },
  kpiCard: { background: "#fff", borderRadius: 10, padding: 12, boxShadow: "0 1px 3px rgba(15,23,42,0.08)" },
  card: { background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 1px 3px rgba(15,23,42,0.08)", marginBottom: 12 },
  split: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 120 },
  btn: { padding: "8px 12px", borderRadius: 8, border: "none", background: "#334155", color: "#fff", cursor: "pointer", fontWeight: 700 },
  btnPrimary: { padding: "8px 12px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontWeight: 700 },
  btnGhost: { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" },
  btnSm: { padding: "4px 8px", borderRadius: 6, border: "none", background: "#475569", color: "#fff", cursor: "pointer", fontSize: 12, marginRight: 4 },
  badge: { padding: "4px 8px", borderRadius: 999, background: "#e2e8f0", color: "#334155", fontWeight: 700, fontSize: 12 },
  chk: { fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 4 },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", borderBottom: "2px solid #e2e8f0", padding: "8px 6px", color: "#64748b" },
  td: { borderBottom: "1px solid #f1f5f9", padding: "8px 6px", verticalAlign: "top" },
  error: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 10 },
  banner: { background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: 10, padding: "10px 12px", marginBottom: 12 },
  linkBtn: { border: "none", background: "transparent", color: "#1d4ed8", textDecoration: "underline", cursor: "pointer", fontWeight: 700 },
  dashboardCharts: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, alignItems: "stretch" },
  chartCard: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", minHeight: 250 },
  chartTitle: { fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 10 },
  chartBody: { height: 210, display: "flex", alignItems: "center", justifyContent: "center" },
  barChartWrap: { display: "flex", gap: 12, alignItems: "flex-end", minHeight: 180, width: "100%", justifyContent: "space-between" },
  trendWrap: { display: "flex", gap: 10, alignItems: "flex-end", minHeight: 100, paddingTop: 10 },
  trendCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  trendBar: { width: 24, background: "#c7d2fe", borderRadius: 6 },
  legendRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: "#334155" },
  legendDot: { width: 12, height: 12, borderRadius: 999, display: "inline-block" },
  toast: { background: "#0f172a", color: "#fff", padding: "8px 10px", borderRadius: 8, marginBottom: 8, maxWidth: 320, fontSize: 13 },
};
