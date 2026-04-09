export const styles = {
  shell: { display: "flex", minHeight: "100vh", background: "#f1f5f9", overflow: "hidden" },
  sidebar: {
    width: 280,
    minWidth: 280,
    background: "linear-gradient(180deg, #0a1628 0%, #0f2137 48%, #0a1628 100%)",
    color: "#e2e8f0",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    boxShadow: "8px 0 30px rgba(10,22,40,0.35)",
    position: "relative",
    overflow: "hidden",
  },
  navItem: { textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 600, transition: "all 0.2s ease" },
  navItemActive: {
    background: "linear-gradient(90deg, #ea580c 0%, #F37021 55%, #fb923c 100%)",
    color: "#fff",
    boxShadow: "0 4px 20px rgba(243,112,33,0.4)",
  },
  main: { flex: 1, padding: "0 24px 16px", overflow: "auto", marginLeft: 356, height: "100vh", background: "#f1f5f9" },
  topbar: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(226,232,240,0.8)",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
    boxShadow: "0 4px 20px rgba(15,23,42,0.06)",
  },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 14 },
  kpiCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
    border: "1px solid #f1f5f9",
    transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)",
    cursor: "default",
    position: "relative",
    overflow: "hidden",
  },
  card: {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(8px)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 1px 4px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.02)",
    border: "1px solid rgba(226,232,240,0.7)",
    marginBottom: 12,
    animation: "cardEntrance 0.4s ease-out both",
    transition: "box-shadow 0.3s ease",
  },
  split: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  input: { padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", minWidth: 130, fontSize: 13, transition: "border-color 0.2s ease, box-shadow 0.2s ease", outline: "none", background: "#fff" },
  btn: { padding: "9px 14px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s ease" },
  btnPrimary: { padding: "9px 14px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.2s ease" },
  btnGhost: { padding: "9px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", transition: "all 0.2s ease" },
  btnSm: { padding: "4px 8px", borderRadius: 6, border: "none", background: "#475569", color: "#fff", cursor: "pointer", fontSize: 12, marginRight: 4, transition: "all 0.2s ease" },
  badge: { padding: "4px 8px", borderRadius: 999, background: "#e2e8f0", color: "#334155", fontWeight: 700, fontSize: 12 },
  chk: { fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 6 },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", borderBottom: "2px solid #f1f5f9", padding: "10px 10px", color: "#94a3b8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" },
  td: { borderBottom: "1px solid #f8fafc", padding: "10px 10px", verticalAlign: "middle", fontSize: 13 },
  error: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px", marginBottom: 10, animation: "fadeInUp 0.3s ease-out" },
  banner: { background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: 12, padding: "12px 14px", marginBottom: 12, animation: "fadeInUp 0.3s ease-out" },
  linkBtn: { border: "none", background: "transparent", color: "#f97316", textDecoration: "underline", cursor: "pointer", fontWeight: 700 },
  dashboardCharts: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, alignItems: "stretch" },
  chartCard: {
    border: "1px solid #f1f5f9",
    borderRadius: 16,
    padding: 16,
    background: "#fff",
    minHeight: 250,
    transition: "box-shadow 0.35s cubic-bezier(0.22,1,0.36,1), transform 0.35s cubic-bezier(0.22,1,0.36,1)",
    overflow: "hidden",
    minWidth: 0,
    animation: "cardEntrance 0.5s ease-out both",
  },
  chartTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 },
  chartBody: { height: 210, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", width: "100%" },
  barChartWrap: { display: "flex", gap: 6, alignItems: "flex-end", minHeight: 180, width: "100%", justifyContent: "space-between" },
  trendCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  trendBar: { width: 24, background: "#f97316", borderRadius: "4px 4px 0 0", transition: "height 0.8s cubic-bezier(0.22,1,0.36,1)" },
  legendRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: "#334155" },
  legendDot: { width: 12, height: 12, borderRadius: 999, display: "inline-block" },
  toast: {
    background: "#0f172a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: 340,
    fontSize: 13,
    boxShadow: "0 8px 24px rgba(15,23,42,0.2)",
    animation: "fadeInRight 0.4s cubic-bezier(0.22,1,0.36,1)",
  },
};

export function toneColor(tone) {
  return { slate: "#64748b", amber: "#d97706", red: "#dc2626", green: "#16a34a", blue: "#2563eb", rose: "#e11d48" }[tone] || "#64748b";
}

export function barColor(ratio) {
  if (ratio > 0.8) return "#f97316";
  if (ratio > 0.55) return "#fb923c";
  if (ratio > 0.3) return "#fdba74";
  return "#fed7aa";
}

export function badge(status) {
  const base = { padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em" };
  if (status === "late") return { ...base, background: "#fef2f2", color: "#991b1b" };
  if (status === "active") return { ...base, background: "#f0fdf4", color: "#166534" };
  if (status === "contacting") return { ...base, background: "#eff6ff", color: "#1e40af" };
  if (status === "closed") return { ...base, background: "#f8fafc", color: "#64748b" };
  return { ...base, background: "#fff7ed", color: "#ea580c" };
}
