import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, setToken } from "../api";
import { LEADS_PAGE_SIZE } from "../constants/leadConstants";
import { downloadAuthorizedBlob } from "../utils/downloadBlob";
import { normText } from "../utils/normText";
import { useAppWebSocket } from "./useAppWebSocket";

/** Authenticated app state, loaders, and handlers (admin + sale). */
export function useDashboardApp() {
  const [user, setUser] = useState(null);
  const [boot, setBoot] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [err, setErr] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [trend7, setTrend7] = useState([]);
  const [contactRate7, setContactRate7] = useState([]);
  const [conversionRate7, setConversionRate7] = useState([]);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [chartProgress, setChartProgress] = useState(0);

  const [assigned, setAssigned] = useState("");
  const [phone, setPhone] = useState("");
  const [statusMulti, setStatusMulti] = useState([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [uncontactedOnly, setUncontactedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [leadsPage, setLeadsPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

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
      setTab((t) =>
        t === "dashboard" || t === "settings" || t === "sales-performance" ? "sales-home" : t
      );
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
    if (user?.role !== "sale" || tab !== "notifications") return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/api/v1/notifications/read-all", { method: "POST" });
        if (!cancelled) loadNotifs();
      } catch (e) {
        if (!cancelled) setErr(String(e.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, user?.role, loadNotifs]);

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
    if (!(tab === "users" && user?.role === "admin")) return;
    const id = window.setInterval(() => {
      loadUsers().catch(() => {});
    }, 10000);
    return () => window.clearInterval(id);
  }, [tab, user, loadUsers]);

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
          {
            id: Date.now() + Math.random(),
            text: `Đã đưa ${res.queued} dòng vào hệ thống. Tổng dữ liệu hiện tại: ${res2?.total || 0}.`,
          },
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
    const raw = String(assignPick[leadId] || "").trim();
    const picked = assigneeChoices.find(
      (x) =>
        x.target_username === raw ||
        normText(x.label) === normText(raw) ||
        normText(x.value) === normText(raw)
    );
    const username = picked?.target_username || raw;
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

  async function updateContactCallStatus(leadId, contact_call_status) {
    setErr(null);
    try {
      await apiFetch(`/api/v1/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ contact_call_status }) });
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
        const picked = assigneeChoices.find(
          (x) =>
            x.target_username === bulkAssignUser ||
            normText(x.label) === normText(bulkAssignUser) ||
            normText(x.value) === normText(bulkAssignUser)
        );
        const payload = {
          lead_ids: ids,
          apply_filtered: bulkApplyFiltered,
          filters: buildBulkFilters(),
          action: bulkAction,
          username: picked?.target_username || bulkAssignUser || null,
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
    await downloadAuthorizedBlob(
      `/api/v1/reports/monthly/export?year=${repY}&month=${repM}&worst_min_days=${worstMinDays}&worst_max_days=${worstMaxDays}`,
      `monthly_report_${repY}_${String(repM).padStart(2, "0")}.csv`
    );
  }

  async function downloadLatestSync() {
    await downloadAuthorizedBlob("/api/v1/sync/latest/download", "leads_latest.xlsx");
  }

  async function logout() {
    const t = getToken();
    if (t) {
      try {
        await apiFetch("/api/v1/auth/logout", { method: "POST", timeoutMs: 8000 });
      } catch {
        /* ignore */
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
  const saleAssignees = useMemo(
    () =>
      (users || [])
        .filter((u) => u.role === "sale")
        .map((u) => ({
          username: u.username,
          display_name: String(u.display_name || "").trim().replace(/\s+/g, " ") || u.username,
        }))
        .sort((a, b) => a.display_name.localeCompare(b.display_name, "vi")),
    [users]
  );
  const assigneeChoices = useMemo(() => {
    const out = [];
    const seen = new Set();
    const saleUsernameSet = new Set(
      saleAssignees.map((u) => String(u.username || "").trim().toLowerCase()).filter(Boolean)
    );
    for (const u of saleAssignees) {
      const key = normText(u.display_name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        label: u.display_name,
        value: u.display_name,
        target_username: u.username,
      });
    }
    for (const name of assigneeOptions || []) {
      const label = String(name || "").trim().replace(/\s+/g, " ");
      if (!label) continue;
      if (saleUsernameSet.has(label.toLowerCase())) continue;
      const key = normText(label);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        label,
        value: label,
        target_username: label,
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [saleAssignees, assigneeOptions]);
  const roleLabel = user?.role === "admin" ? "Quản trị viên" : "Nhân viên kinh doanh";
  const nowLabel = new Date(nowTick).toLocaleString("vi-VN", {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  useEffect(() => {
    if (leadsPage > totalLeadPages) setLeadsPage(totalLeadPages);
  }, [leadsPage, totalLeadPages]);

  useEffect(() => {
    setPageInput(String(leadsPage));
  }, [leadsPage]);

  useEffect(() => {
    if (tab !== "dashboard" && tab !== "sales-home") return;
    setChartProgress(0);
    const id = window.setTimeout(() => setChartProgress(1), 40);
    return () => window.clearTimeout(id);
  }, [tab, totalLeads, uncontacted, overdueCount, contactedToday, trend7]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useAppWebSocket({
    user,
    tab,
    load,
    loadNotifs,
    loadSyncMeta,
    loadReport,
    loadAssignees,
    setToasts,
  });

  return {
    user,
    setUser,
    boot,
    tab,
    setTab,
    err,
    setErr,
    toasts,
    uploading,
    stats,
    leads,
    leadsTotal,
    trend7,
    contactRate7,
    conversionRate7,
    activeLeadId,
    setActiveLeadId,
    chartProgress,
    assigned,
    setAssigned,
    phone,
    setPhone,
    statusMulti,
    overdueOnly,
    setOverdueOnly,
    uncontactedOnly,
    setUncontactedOnly,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    leadsPage,
    setLeadsPage,
    pageInput,
    setPageInput,
    notifs,
    users,
    report,
    repY,
    setRepY,
    repM,
    setRepM,
    worstMinDays,
    setWorstMinDays,
    worstMaxDays,
    setWorstMaxDays,
    newUser,
    setNewUser,
    assignPick,
    setAssignPick,
    selected,
    setSelected,
    assigneeOptions,
    bulkAction,
    setBulkAction,
    bulkAssignUser,
    setBulkAssignUser,
    bulkInterest,
    setBulkInterest,
    bulkFollowUpAt,
    setBulkFollowUpAt,
    bulkApplyFiltered,
    setBulkApplyFiltered,
    bulkOnlyOverdue,
    setBulkOnlyOverdue,
    bulkOnlyUncontacted,
    setBulkOnlyUncontacted,
    bulkWorking,
    syncMeta,
    load,
    loadNotifs,
    loadUsers,
    loadAssignees,
    loadReport,
    onUpload,
    patchUser,
    createUser,
    doAssign,
    markContacted,
    saveNotes,
    appendNote,
    updateLeadStatus,
    updateContactCallStatus,
    applySalesPreset,
    runBulkAction,
    runExcelSync,
    downloadReportExport,
    downloadLatestSync,
    logout,
    toggleStatus,
    toggleSelect,
    toggleSelectAllCurrentPage,
    selectAllByCurrentFilter,
    commitPageInput,
    activeLead,
    selectedCount,
    currentPageAllSelected,
    totalLeadPages,
    unread,
    overdueCount,
    contactedToday,
    totalLeads,
    uncontacted,
    slaCompliance,
    assigneeChoices,
    roleLabel,
    nowLabel,
  };
}
