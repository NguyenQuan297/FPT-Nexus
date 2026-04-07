export const styles = {
  shell: { display: "flex", minHeight: "100vh", background: "linear-gradient(180deg, #f0f9ff 0%, #f8fafc 40%, #fff7ed 100%)" },
  sidebar: {
    width: 340,
    background: "linear-gradient(180deg, #0a1628 0%, #0f2137 48%, #0a1628 100%)",
    color: "#e2e8f0",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "8px 0 30px rgba(10,22,40,0.35)",
  },
  navItem: { textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 600 },
  /* Màu thương hiệu FPT: cam chủ đạo, không dùng tím indigo */
  navItemActive: {
    background: "linear-gradient(90deg, #ea580c 0%, #F37021 55%, #fb923c 100%)",
    color: "#fff",
    boxShadow: "inset 3px 0 0 0 #00A651, 0 4px 16px rgba(243,112,33,0.38)",
  },
  main: { flex: 1, padding: 18 },
  topbar: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(148,163,184,0.28)",
    backdropFilter: "blur(8px)",
    borderRadius: 14,
    padding: 12,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
  },
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
  dashboardCharts: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, alignItems: "stretch" },
  chartCard: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", minHeight: 250 },
  chartTitle: { fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 10 },
  chartBody: { height: 210, display: "flex", alignItems: "center", justifyContent: "center" },
  barChartWrap: { display: "flex", gap: 12, alignItems: "flex-end", minHeight: 180, width: "100%", justifyContent: "space-between" },
  trendCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  trendBar: { width: 24, background: "#c7d2fe", borderRadius: 6 },
  legendRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: "#334155" },
  legendDot: { width: 12, height: 12, borderRadius: 999, display: "inline-block" },
  toast: { background: "#0f172a", color: "#fff", padding: "8px 10px", borderRadius: 8, marginBottom: 8, maxWidth: 320, fontSize: 13 },
};

export function toneColor(tone) {
  return { slate: "#64748b", amber: "#d97706", red: "#dc2626", green: "#16a34a", blue: "#2563eb", rose: "#e11d48" }[tone] || "#64748b";
}

export function barColor(ratio) {
  if (ratio > 0.8) return "#6366f1";
  if (ratio > 0.55) return "#818cf8";
  if (ratio > 0.3) return "#a5b4fc";
  return "#c7d2fe";
}

export function badge(status) {
  const base = { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "uppercase" };
  if (status === "late") return { ...base, background: "#fee2e2", color: "#991b1b" };
  if (status === "active") return { ...base, background: "#dcfce7", color: "#166534" };
  if (status === "contacting") return { ...base, background: "#dbeafe", color: "#1e40af" };
  if (status === "closed") return { ...base, background: "#f3f4f6", color: "#374151" };
  return { ...base, background: "#fef3c7", color: "#92400e" };
}
