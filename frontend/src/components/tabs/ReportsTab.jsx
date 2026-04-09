import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { styles } from "../../styles/appStyles";

/* ── Icons ─────────────────────────────────────── */
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

/* ── KPI Icon SVGs ─────────────────────────────── */
const kpiIcons = [
  { bg: "#f97316", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { bg: "#ef4444", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/></svg> },
  { bg: "#2563eb", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg> },
  { bg: "#ef4444", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  { bg: "#22c55e", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
  { bg: "#22c55e", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg> },
  { bg: "#8b5cf6", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { bg: "#8b5cf6", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
];

/* ── Progress bar ──────────────────────────────── */
function ProgressBar({ pct, color = "#22c55e" }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", minWidth: 60 }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 48, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

/* ── Branch badge ──────────────────────────────── */
function BranchBadge({ branch }) {
  const isHP = branch.includes("Hải Phòng");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
      background: isHP ? "#fff7ed" : "#f1f5f9",
      color: isHP ? "#ea580c" : "#64748b",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isHP ? "#ea580c" : "#94a3b8" }} />
      {branch}
    </span>
  );
}

/* ── Short name helper: "Nguyễn Thị Nhật Hoa FSC Hải Phòng" → "Nhật Hoa" */
function shortName(fullName) {
  if (!fullName) return "-";
  // Remove branch/location suffixes like "FSC Hải Phòng", "FSC Hoa Lạc", etc.
  let s = fullName.replace(/\s+FSC?\s.*/i, "").trim();
  if (!s) s = fullName.trim();
  const parts = s.split(/\s+/);
  // Vietnamese: family name first, given name last — take last 2 parts
  if (parts.length >= 2) return parts.slice(-2).join(" ");
  return parts[0] || fullName;
}

/* ── Conversion Chart (grouped bar) ───────────── */
function ConversionChart({ data }) {
  if (!data || !data.length) return <div style={{ color: "#94a3b8", padding: 20 }}>Không có dữ liệu</div>;
  const sorted = [...data].sort((a, b) => (b.reg_count + b.nb_count + b.ne_count) - (a.reg_count + a.nb_count + a.ne_count));
  const top = sorted.slice(0, 8);
  const maxVal = Math.max(...top.map(d => Math.max(d.reg_count, d.nb_count, d.ne_count, 1)));
  const barH = 180;
  const [hoverI, setHoverI] = useState(null);

  // Y-axis grid lines
  const yTicks = [];
  const step = maxVal <= 5 ? 1 : maxVal <= 20 ? Math.ceil(maxVal / 4) : Math.ceil(maxVal / 5);
  for (let v = 0; v <= maxVal; v += step) yTicks.push(v);
  if (yTicks[yTicks.length - 1] < maxVal) yTicks.push(Math.ceil(maxVal / step) * step);
  const yMax = yTicks[yTicks.length - 1] || 1;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", paddingLeft: 36 }}>
        {/* Y-axis */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 40, width: 36, display: "flex", flexDirection: "column-reverse", justifyContent: "space-between" }}>
          {yTicks.map((v) => (
            <span key={v} style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", paddingRight: 6, lineHeight: "1" }}>{v}</span>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, position: "relative", minHeight: barH + 40, borderLeft: "1px solid #e2e8f0" }}>
          {/* Grid lines */}
          {yTicks.map((v) => (
            <div key={v} style={{ position: "absolute", left: 0, right: 0, bottom: 40 + (v / yMax) * barH, height: 1, background: "#f1f5f9" }} />
          ))}

          {/* Bars */}
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: barH, paddingBottom: 0, position: "relative", zIndex: 1 }}>
            {top.map((d, i) => {
              const isHover = hoverI === i;
              return (
                <div key={d.assignee} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", flex: 1 }}
                  onMouseEnter={() => setHoverI(i)} onMouseLeave={() => setHoverI(null)}>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: barH }}>
                    {d.reg_count > 0 && (
                      <div style={{ width: 22, background: "#f97316", borderRadius: "3px 3px 0 0", height: Math.max(3, (d.reg_count / yMax) * barH), transition: "height 0.5s", opacity: isHover ? 1 : 0.85 }} />
                    )}
                    {d.nb_count > 0 && (
                      <div style={{ width: 22, background: "#3b82f6", borderRadius: "3px 3px 0 0", height: Math.max(3, (d.nb_count / yMax) * barH), transition: "height 0.5s", opacity: isHover ? 1 : 0.85 }} />
                    )}
                    {d.ne_count > 0 && (
                      <div style={{ width: 22, background: "#94a3b8", borderRadius: "3px 3px 0 0", height: Math.max(3, (d.ne_count / yMax) * barH), transition: "height 0.5s", opacity: isHover ? 1 : 0.85 }} />
                    )}
                    {d.reg_count === 0 && d.nb_count === 0 && d.ne_count === 0 && (
                      <div style={{ width: 22, background: "#e2e8f0", borderRadius: "3px 3px 0 0", height: 3 }} />
                    )}
                  </div>
                  {/* Tooltip */}
                  {isHover && (
                    <div style={{
                      position: "absolute", bottom: "100%", marginBottom: 8, left: "50%", transform: "translateX(-50%)",
                      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px",
                      fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 20, whiteSpace: "nowrap",
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.assignee.split(" ").slice(-2).join(" ")}</div>
                      <div><strong>REG : {d.reg_count}</strong></div>
                      <div style={{ color: "#3b82f6" }}>NB : {d.nb_count}</div>
                      <div style={{ color: "#94a3b8" }}>NE : {d.ne_count}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
            {top.map((d, i) => {
              const name = shortName(d.assignee);
              return (
                <span key={d.assignee} style={{ flex: 1, textAlign: "center", fontSize: 11, color: hoverI === i ? "#0f172a" : "#94a3b8", fontWeight: hoverI === i ? 700 : 400 }}>
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#f97316" }} /> REG</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#3b82f6" }} /> NB</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#94a3b8" }} /> NE</span>
      </div>
    </div>
  );
}

/* ── SLA Quick Bar ─────────────────────────────── */
function SlaQuickBars({ data }) {
  if (!data || !data.length) return null;
  const sorted = [...data].sort((a, b) => b.sla_compliance_pct - a.sla_compliance_pct).slice(0, 10);
  return (
    <div>
      {sorted.map((s) => {
        const name = shortName(s.assignee);
        const branchShort = s.branch.includes("Hải Phòng") ? "HP" : "KH";
        return (
          <div key={s.assignee} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ minWidth: 80, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{name}</span>
            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: branchShort === "HP" ? "#fff7ed" : "#f1f5f9", color: branchShort === "HP" ? "#ea580c" : "#94a3b8" }}>{branchShort}</span>
            <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${s.sla_compliance_pct}%`, height: "100%", background: "#22c55e", borderRadius: 999, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", minWidth: 48, textAlign: "right" }}>{s.sla_compliance_pct.toFixed(1)}%</span>
            <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 50, textAlign: "right" }}>{s.total_leads} lead</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ────────────────────────────── */

export default function ReportsTab({
  repY,
  setRepY,
  repM,
  setRepM,
  loadReport,
  downloadReportExport,
  downloadReportExportTotal,
  setErr,
  report,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [branchFilter, setBranchFilter] = useState("all");

  const dateFrom = `${repY}-${String(repM).padStart(2, "0")}-01`;
  const lastDay = new Date(repY, repM, 0).getDate();
  const dateTo = `${repY}-${String(repM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Filtered data by branch
  const { filteredSla, filteredConversion } = useMemo(() => {
    if (!report) return { filteredSla: [], filteredConversion: [] };
    const bySale = report.by_sale || [];
    const conv = report.conversion_by_assignee || [];
    if (branchFilter === "all") return { filteredSla: bySale, filteredConversion: conv };
    return {
      filteredSla: bySale.filter((s) => s.branch === branchFilter),
      filteredConversion: conv.filter((c) => c.branch === branchFilter),
    };
  }, [report, branchFilter]);

  const branches = report?.branches || [];
  const hpBranch = branches.find((b) => b.name.includes("Hải Phòng"));
  const otherBranch = branches.find((b) => !b.name.includes("Hải Phòng"));

  const tabs = [
    { id: "overview", label: "Tổng quan" },
    { id: "sla", label: "SLA chi tiết", count: report?.by_sale?.length },
    { id: "conversion", label: "Chuyển đổi", count: report?.conversion_by_assignee?.length },
  ];

  const branchTabs = [
    { id: "all", label: "Tất cả", count: report?.by_sale?.length },
    ...(hpBranch ? [{ id: "FSC Hải Phòng", label: "FSC Hải Phòng", count: (report?.by_sale || []).filter(s => s.branch === "FSC Hải Phòng").length }] : []),
    ...(otherBranch ? [{ id: "Cơ sở khác", label: "Cơ sở khác", count: (report?.by_sale || []).filter(s => s.branch === "Cơ sở khác").length }] : []),
  ];

  const kpiData = report ? [
    { label: "Tổng lead", value: report.total_leads_created, color: "#ea580c", bg: "#fff7ed" },
    { label: hpBranch ? `Lead ${hpBranch.name}` : "Lead cơ sở chính", value: hpBranch?.total_leads ?? 0, color: "#ef4444", bg: "#fef2f2" },
    { label: "Lead cơ sở khác", value: otherBranch?.total_leads ?? 0, color: "#2563eb", bg: "#eff6ff" },
    { label: "Lead trễ SLA", value: report.overdue_leads, color: "#ef4444", bg: "#fef2f2" },
    { label: "Tỷ lệ SLA", value: `${report.sla_compliance_pct}%`, color: "#22c55e", bg: "#f0fdf4" },
    { label: "Tổng REG", value: report.total_reg, color: "#22c55e", bg: "#f0fdf4" },
    { label: "Tỷ lệ REG", value: `${report.reg_pct}%`, color: "#8b5cf6", bg: "#f5f3ff" },
    { label: "Tư vấn viên", value: report.tvv_count, color: "#8b5cf6", bg: "#f5f3ff" },
  ] : [];

  return (
    <section>
      {/* Header tabs + date range + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={tabRow}>
          {tabs.map((t) => (
            <button key={t.id} style={{ ...tabBtn, ...(activeTab === t.id ? tabBtnActive : {}) }} onClick={() => setActiveTab(t.id)}>
              {t.label}
              {t.count != null && <span style={tabCount}>{t.count}</span>}
            </button>
          ))}
        </div>

        {(activeTab === "sla" || activeTab === "conversion") && (
          <>
            <span style={{ width: 1, height: 24, background: "#e2e8f0" }} />
            <button style={filterIconBtn}><IconFilter /></button>
            {branchTabs.map((t) => (
              <button key={t.id} style={{ ...branchBtn, ...(branchFilter === t.id ? branchBtnActive : {}) }} onClick={() => setBranchFilter(t.id)}>
                {t.label} <span style={{ fontWeight: 800, marginLeft: 3 }}>{t.count}</span>
              </button>
            ))}
          </>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="date" style={styles.input} value={dateFrom} onChange={(e) => {
            const parts = (e.target.value || "").split("-");
            if (parts.length === 3) { setRepY(Number(parts[0])); setRepM(Number(parts[1])); }
          }} />
          <span style={{ color: "#94a3b8" }}>—</span>
          <input type="date" style={styles.input} value={dateTo} readOnly />
          <button style={applyBtn} onClick={loadReport}>Áp dụng</button>
        </div>

        <button style={exportBtn} onClick={() => downloadReportExport().catch((e) => setErr(String(e)))}>
          <IconDownload /> Xuất theo tháng
        </button>
        <button style={exportTotalBtn} onClick={() => downloadReportExportTotal().catch((e) => setErr(String(e)))}>
          <IconDownload /> Xuất tổng
        </button>
      </div>

      {!report && (
        <div style={{ ...styles.card, textAlign: "center", padding: 40, color: "#94a3b8" }}>
          Chọn khoảng thời gian và nhấn "Áp dụng" để xem báo cáo
        </div>
      )}

      {report && (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10, marginBottom: 16 }}>
            {kpiData.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                style={{ ...kpiCard, background: k.bg }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 12, background: kpiIcons[i]?.bg || k.color, display: "grid", placeItems: "center", marginBottom: 10, boxShadow: `0 4px 12px ${k.color}22` }}>
                  {kpiIcons[i]?.icon}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: k.color, lineHeight: 1.1 }}>
                  {typeof k.value === "number" ? k.value.toLocaleString("vi-VN") : k.value}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{k.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Branch summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: hpBranch && otherBranch ? "55fr 45fr" : "1fr", gap: 14, marginBottom: 16 }}>
            {hpBranch && (
              <div style={branchCardHP}>
                {/* Decorative circle */}
                <div style={{ position: "absolute", top: -48, right: -48, width: 128, height: 128, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)" }}>
                    📍 {hpBranch.name.toUpperCase()}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div><div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{hpBranch.total_leads.toLocaleString("vi-VN")}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Tổng lead</div></div>
                    <div><div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{hpBranch.total_reg}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>Tổng REG</div></div>
                    <div><div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{hpBranch.tvv_count}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>TVV</div></div>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.7)" }}>Tỷ lệ REG: </span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{hpBranch.reg_pct}%</span>
                  </div>
                </div>
              </div>
            )}
            {otherBranch && (
              <div style={branchCardOther}>
                <div style={{ position: "absolute", top: -48, right: -48, width: 128, height: 128, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.7)" }}>
                    🏢 {otherBranch.name.toUpperCase()}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div><div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{otherBranch.total_leads.toLocaleString("vi-VN")}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Tổng lead</div></div>
                    <div><div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{otherBranch.total_reg}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Tổng REG</div></div>
                    <div><div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{otherBranch.tvv_count}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>TVV</div></div>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Tỷ lệ REG: </span>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{otherBranch.reg_pct}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <>
              {/* Conversion chart */}
              <div style={styles.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: "#f97316" }} />
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Hiệu suất chuyển đổi theo tư vấn viên (REG · NB · NE)</h4>
                </div>
                <ConversionChart data={report.conversion_by_assignee} />
              </div>

              {/* SLA quick bars */}
              <div style={styles.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: "#2563eb" }} />
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tỷ lệ SLA nhanh theo tư vấn viên</h4>
                  </div>
                  <button style={{ ...styles.linkBtn, color: "#f97316", fontSize: 13 }} onClick={() => setActiveTab("sla")}>Xem chi tiết →</button>
                </div>
                <SlaQuickBars data={report.by_sale} />
              </div>

            </>
          )}

          {activeTab === "sla" && (
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: "#2563eb" }} />
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Bảng SLA theo người phụ trách</h4>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b" }}>
                  {branches.map((b) => (
                    <span key={b.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: b.name.includes("Hải Phòng") ? "#ea580c" : "#94a3b8" }} />
                      {b.name}: {(report.by_sale || []).filter(s => s.branch === b.name).length}
                    </span>
                  ))}
                </div>
              </div>
              <SlaTable data={filteredSla} branches={branches} branchFilter={branchFilter} />
            </div>
          )}

          {activeTab === "conversion" && (
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: "#22c55e" }} />
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Bảng phân tích tỷ lệ chuyển đổi</h4>
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Tổng REG: <strong style={{ color: "#22c55e" }}>{report.total_reg}</strong>
                  <span style={{ marginLeft: 12 }}>Tỷ lệ: <strong style={{ color: "#22c55e" }}>{report.reg_pct}%</strong></span>
                </div>
              </div>
              <ConversionTable data={filteredConversion} branches={branches} branchFilter={branchFilter} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ── SLA Table ─────────────────────────────────── */
function SlaTable({ data, branches, branchFilter }) {
  const grouped = {};
  data.forEach((s) => { grouped[s.branch] = grouped[s.branch] || []; grouped[s.branch].push(s); });

  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th style={styles.th}>NGƯỜI PHỤ TRÁCH</th>
            <th style={styles.th}>CƠ SỞ</th>
            <th style={{ ...styles.th, textAlign: "right" }}>SỐ LEAD</th>
            <th style={{ ...styles.th, textAlign: "right" }}>SỐ LEAD TRỄ</th>
            <th style={styles.th}>TỶ LỆ ĐẠT SLA</th>
          </tr>
        </thead>
        <tbody>
          {branches.filter(b => branchFilter === "all" || b.name === branchFilter).map((b) => {
            const rows = grouped[b.name] || [];
            if (!rows.length) return null;
            return [
              <tr key={`h-${b.name}`} style={{ background: "#f8fafc" }}>
                <td colSpan={5} style={{ ...styles.td, padding: "10px 10px", borderBottom: "2px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{b.name.includes("Hải Phòng") ? "📍" : "🏢"}</span>
                    <strong style={{ color: b.name.includes("Hải Phòng") ? "#ea580c" : "#475569", fontSize: 13, letterSpacing: "0.04em" }}>
                      {b.name.toUpperCase()}
                    </strong>
                    <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{rows.length} người</span>
                  </div>
                </td>
              </tr>,
              ...rows.map((s) => (
                <tr key={s.assignee}>
                  <td style={{ ...styles.td, fontWeight: 600, paddingLeft: 20 }}>{s.assignee}</td>
                  <td style={styles.td}><BranchBadge branch={s.branch} /></td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>{s.total_leads}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: s.overdue_leads > 0 ? "#ef4444" : "#22c55e", fontWeight: 700 }}>{s.overdue_leads}</td>
                  <td style={{ ...styles.td, minWidth: 180 }}><ProgressBar pct={s.sla_compliance_pct} /></td>
                </tr>
              )),
            ];
          })}
          {/* Totals row */}
          <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
            <td colSpan={2} style={{ ...styles.td, fontWeight: 700, fontSize: 13 }}>Tổng cộng ({data.length} người)</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{data.reduce((a, s) => a + s.total_leads, 0)}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, color: "#ef4444" }}>{data.reduce((a, s) => a + s.overdue_leads, 0)}</td>
            <td style={styles.td}>
              {(() => {
                const t = data.reduce((a, s) => a + s.total_leads, 0);
                const o = data.reduce((a, s) => a + s.overdue_leads, 0);
                const p = t ? ((t - o) / t) * 100 : 100;
                return <ProgressBar pct={p} />;
              })()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ── Conversion Table ──────────────────────────── */
function ConversionTable({ data }) {
  const grouped = {};
  data.forEach((s) => { grouped[s.branch] = grouped[s.branch] || []; grouped[s.branch].push(s); });

  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th style={styles.th}>NGƯỜI PHỤ TRÁCH</th>
            <th style={styles.th}>CƠ SỞ</th>
            <th style={{ ...styles.th, textAlign: "right" }}>TỔNG LEAD</th>
            <th style={{ ...styles.th, textAlign: "right" }}>SỐ LƯỢNG REG</th>
            <th style={{ ...styles.th, textAlign: "right" }}>SỐ LƯỢNG NB</th>
            <th style={{ ...styles.th, textAlign: "right" }}>SỐ LƯỢNG NE</th>
            <th style={styles.th}>TỶ LỆ REG</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.assignee}>
              <td style={{ ...styles.td, fontWeight: 600 }}>{r.assignee}</td>
              <td style={styles.td}><BranchBadge branch={r.branch} /></td>
              <td style={{ ...styles.td, textAlign: "right" }}>{r.total_leads}</td>
              <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{r.reg_count}</td>
              <td style={{ ...styles.td, textAlign: "right", color: "#3b82f6" }}>{r.nb_count}</td>
              <td style={{ ...styles.td, textAlign: "right" }}>{r.ne_count}</td>
              <td style={{ ...styles.td, minWidth: 160 }}><ProgressBar pct={r.reg_pct} color={r.reg_pct >= 10 ? "#22c55e" : r.reg_pct > 0 ? "#f59e0b" : "#e2e8f0"} /></td>
            </tr>
          ))}
          {/* Totals */}
          <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
            <td colSpan={2} style={{ ...styles.td, fontWeight: 700, fontSize: 13 }}>Tổng cộng ({data.length} người)</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{data.reduce((a, r) => a + r.total_leads, 0)}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{data.reduce((a, r) => a + r.reg_count, 0)}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, color: "#3b82f6" }}>{data.reduce((a, r) => a + r.nb_count, 0)}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{data.reduce((a, r) => a + r.ne_count, 0)}</td>
            <td style={styles.td}>
              {(() => {
                const t = data.reduce((a, r) => a + r.total_leads, 0);
                const reg = data.reduce((a, r) => a + r.reg_count, 0);
                return <ProgressBar pct={t ? (reg / t) * 100 : 0} />;
              })()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}


/* ── Styles ──────────────────────────────────────── */

const tabRow = { display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0" };
const tabBtn = { border: "none", background: "#fff", color: "#64748b", padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const tabBtnActive = { background: "#0f172a", color: "#fff" };
const tabCount = { padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "rgba(249,115,22,0.15)", color: "#f97316" };

const branchBtn = { border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const branchBtnActive = { background: "#2563eb", color: "#fff", borderColor: "#2563eb" };
const filterIconBtn = { border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "6px 8px", color: "#94a3b8", cursor: "pointer", display: "grid", placeItems: "center" };

const applyBtn = { border: "none", background: "#0f172a", color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const exportBtn = { border: "none", background: "#217346", color: "#fff", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const exportTotalBtn = { border: "1px solid #217346", background: "#fff", color: "#217346", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const kpiCard = { borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" };

const branchCardHP = {
  background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
  color: "#fff", borderRadius: 20, padding: "20px 24px",
  position: "relative", overflow: "hidden",
  boxShadow: "0 8px 24px rgba(249,115,22,0.25)",
};
const branchCardOther = {
  background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
  color: "#fff", borderRadius: 20, padding: "20px 24px",
  position: "relative", overflow: "hidden",
  boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
};
