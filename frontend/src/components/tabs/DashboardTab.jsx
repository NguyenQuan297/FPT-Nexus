import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarFrequencyChart,
  ChartCard,
  Kpi,
  LineTrendChart,
  PieStatusChart,
  ZoomableChart,
} from "../dashboard/DashboardCharts";
import { styles } from "../../styles/appStyles";

function sliceByPeriod(data, period) {
  if (!data || !data.length || period === "all") return data;
  const days = period === "7d" ? 7 : 30;
  return data.slice(-days);
}

export default function DashboardTab({
  user,
  totalLeads,
  uncontacted,
  overdueCount,
  contactedToday,
  slaCompliance,
  visibleStats,
  trend7,
  contactRate7,
  conversionRate7,
  chartProgress,
  onOpenLeads,
  nowLabel,
  report,
}) {
  const [period, setPeriod] = useState("7d");
  const [localProgress, setLocalProgress] = useState(chartProgress);
  const periodRef = useRef(period);

  useEffect(() => {
    if (periodRef.current !== period) {
      periodRef.current = period;
      setLocalProgress(0);
      const id = window.setTimeout(() => setLocalProgress(1), 60);
      return () => window.clearTimeout(id);
    }
  }, [period]);

  useEffect(() => { setLocalProgress(chartProgress); }, [chartProgress]);

  const animProgress = localProgress;
  const atRisk = visibleStats?.at_risk ?? 0;
  const conversionRegPct = visibleStats?.conversion_reg_pct ?? 0;
  const dailyMisses = visibleStats?.daily_misses_today ?? 0;

  const trendData = useMemo(() => sliceByPeriod(trend7, period), [trend7, period]);
  const contactRateData = useMemo(() => sliceByPeriod(contactRate7, period), [contactRate7, period]);
  const conversionRateData = useMemo(() => sliceByPeriod(conversionRate7, period), [conversionRate7, period]);

  const kpis = [
    { title: "Tổng lead", value: totalLeads, tone: "slate" },
    { title: "Chưa liên hệ", value: uncontacted, tone: "amber" },
    { title: "Sắp quá hạn (12-18h)", value: atRisk, tone: "red" },
    { title: "Quá hạn SLA", value: overdueCount, tone: "blue" },
    { title: "Đã liên hệ", value: contactedToday, tone: "green" },
    { title: "Tỷ lệ đạt SLA", value: `${slaCompliance.toFixed(1)}%`, tone: "blue" },
    { title: "Tỷ lệ chuyển đổi REG", value: `${Number(conversionRegPct || 0).toFixed(1)}%`, tone: "green" },
    ...(user.role === "admin" && dailyMisses != null
      ? [{ title: "Lead trễ hôm nay", value: dailyMisses, tone: "rose" }]
      : []),
  ];

  const periodBtns = [
    { id: "7d", label: "7 ngày" },
    { id: "30d", label: "30 ngày" },
    { id: "all", label: "Tất cả" },
  ];

  return (
    <>
      {/* KPI Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>KPI Tổng quan</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Cập nhật lúc {nowLabel || new Date().toLocaleTimeString("vi-VN")} · {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          </div>
          <div style={liveIndicator}>
            <span className="animate-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>Live data</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
          {kpis.map((k, i) => (
            <motion.div
              key={k.title}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              style={{ flex: "0 0 auto", minWidth: 170 }}
            >
              <Kpi title={k.title} value={k.value} tone={k.tone} index={i} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {overdueCount > 0 && (
        <div style={styles.banner}>
          Cảnh báo: {overdueCount} lead đang quá hạn SLA.{" "}
          <button style={styles.linkBtn} onClick={onOpenLeads}>
            Xem danh sách
          </button>
        </div>
      )}

      {/* Charts Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Xu hướng theo ngày</h3>
            <p style={{ marginTop: 2, marginBottom: 0, fontSize: 12, color: "#94a3b8" }}>
              Từ ngày có dữ liệu đến hiện tại · Hover vào biểu đồ để xem chi tiết
            </p>
          </div>
          <div style={periodWrap}>
            {periodBtns.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setPeriod(b.id)}
                style={{
                  ...periodBtn,
                  ...(period === b.id ? periodBtnActive : {}),
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={styles.dashboardCharts}
          >
            <ChartCard title="Tần suất lead theo ngày" subtitle="Số lượng lead nhận mới ngày" chartType="Bar">
              <ZoomableChart chartTitle="Tần suất lead theo ngày" allData={trend7}>
                {(z, modalData) => (
                  <BarFrequencyChart
                    data={z && modalData ? modalData : trendData}
                    progress={animProgress}
                    zoomed={z}
                  />
                )}
              </ZoomableChart>
            </ChartCard>
            <ChartCard title="Tỷ lệ liên hệ theo ngày" subtitle="Tỷ lệ % lead được liên hệ trong ngày" chartType="Line">
              <ZoomableChart chartTitle="Tỷ lệ liên hệ theo ngày" allData={contactRate7}>
                {(z, modalData) => (
                  <LineTrendChart
                    data={z && modalData ? modalData : contactRateData}
                    progress={animProgress}
                    zoomed={z}
                    valueSuffix="%"
                  />
                )}
              </ZoomableChart>
            </ChartCard>
            <ChartCard title="Xu hướng chuyển đổi REG" subtitle="Số lead chuyển đổi thành học sinh đăng ký" chartType="Line">
              <ZoomableChart chartTitle="Xu hướng chuyển đổi REG" allData={conversionRate7}>
                {(z, modalData) => (
                  <LineTrendChart
                    data={z && modalData ? modalData : conversionRateData}
                    progress={animProgress}
                    zoomed={z}
                    valueSuffix="%"
                  />
                )}
              </ZoomableChart>
            </ChartCard>
            <ChartCard title="Phân bổ tình trạng lead" subtitle="Tỷ lệ lead đã liên hệ so với chưa liên hệ" chartType="Pie">
              <ZoomableChart chartTitle="Phân bổ tình trạng lead">
                {(z) => (
                  <PieStatusChart
                    total={totalLeads}
                    contacted={Math.max(0, totalLeads - uncontacted)}
                    overdue={overdueCount}
                    waiting={Math.max(0, uncontacted - overdueCount)}
                    progress={animProgress}
                    zoomed={z}
                  />
                )}
              </ZoomableChart>
            </ChartCard>
          </motion.div>
        </AnimatePresence>
      </motion.section>

      {/* Conversion & Status Breakdown Tables */}
      {report && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{ marginTop: 16 }}
        >
          <div style={styles.dashboardCharts}>
            {/* Conversion table */}
            <div style={{ ...styles.card, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: "#22c55e" }} />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Chuyển đổi theo tư vấn viên</h4>
              </div>
              <ConversionMiniTable data={(report.conversion_by_assignee || []).filter(r => r.assignee !== "Chưa gán" && isHP(r.assignee))} />
            </div>
            {/* Status breakdown table */}
            <div style={{ ...styles.card, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: "#6366f1" }} />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Trạng thái lead theo nhân sự</h4>
              </div>
              <StatusMiniTable data={(report.status_breakdown || []).filter(r => r.assignee !== "Chưa gán" && isHP(r.assignee))} />
            </div>
          </div>
        </motion.section>
      )}
    </>
  );
}

/* ── Mini tables for dashboard ─────────────────── */
function isHP(n) {
  const s = (n || "").toLowerCase();
  return s.includes("hải phòng") || s.includes("hai phong");
}

function ConversionMiniTable({ data }) {
  const row = (r) => (
    <tr key={r.assignee}>
      <td style={{ ...styles.td, fontWeight: 600, fontSize: 12 }}>{r.assignee}</td>
      <td style={{ ...styles.td, textAlign: "right", fontSize: 12 }}>{r.total_leads}</td>
      <td style={{ ...styles.td, textAlign: "right", fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{r.reg_count}</td>
      <td style={{ ...styles.td, textAlign: "right", fontSize: 12, color: "#3b82f6" }}>{r.nb_count}</td>
      <td style={{ ...styles.td, textAlign: "right", fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>{r.reg_pct.toFixed(1)}%</td>
    </tr>
  );

  const totLeads = data.reduce((s, r) => s + r.total_leads, 0);
  const totReg = data.reduce((s, r) => s + r.reg_count, 0);
  const totNb = data.reduce((s, r) => s + r.nb_count, 0);

  return (
    <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
      <table style={{ ...styles.table, fontSize: 12 }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr style={{ background: "#1e293b" }}>
            <th style={{ ...styles.th, color: "#fff" }}>NHÂN SỰ</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>LEAD</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>REG</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>NB</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>TỶ LỆ</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row)}
          <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
            <td style={{ ...styles.td, fontWeight: 700, fontSize: 12 }}>TỔNG ({data.length})</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12 }}>{totLeads}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#16a34a" }}>{totReg}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#3b82f6" }}>{totNb}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#7c3aed" }}>{totLeads ? ((totReg / totLeads) * 100).toFixed(1) : "0.0"}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StatusMiniTable({ data }) {
  const row = (r) => {
    const total = r.quan_tam + r.suy_nghi_them + r.tiem_nang + r.khong_quan_tam + r.khong_phu_hop + r.chua_cap_nhat;
    return (
      <tr key={r.assignee}>
        <td style={{ ...styles.td, fontWeight: 600, fontSize: 12 }}>{r.assignee}</td>
        <td style={{ ...styles.td, textAlign: "right", fontSize: 12, color: r.quan_tam > 0 ? "#16a34a" : "#94a3b8", fontWeight: r.quan_tam > 0 ? 700 : 400 }}>{r.quan_tam}</td>
        <td style={{ ...styles.td, textAlign: "right", fontSize: 12, color: r.suy_nghi_them > 0 ? "#d97706" : "#94a3b8", fontWeight: r.suy_nghi_them > 0 ? 700 : 400 }}>{r.suy_nghi_them}</td>
        <td style={{ ...styles.td, textAlign: "right", fontSize: 12, color: r.chua_cap_nhat > 0 ? "#2563eb" : "#94a3b8", fontWeight: r.chua_cap_nhat > 0 ? 700 : 400, background: r.chua_cap_nhat > 0 ? "#eff6ff" : "transparent" }}>{r.chua_cap_nhat}</td>
        <td style={{ ...styles.td, textAlign: "right", fontSize: 12, fontWeight: 700 }}>{total}</td>
      </tr>
    );
  };

  const sumQt = data.reduce((s, r) => s + r.quan_tam, 0);
  const sumSnt = data.reduce((s, r) => s + r.suy_nghi_them, 0);
  const sumCcn = data.reduce((s, r) => s + r.chua_cap_nhat, 0);
  const sumTotal = data.reduce((s, r) => s + r.quan_tam + r.suy_nghi_them + r.tiem_nang + r.khong_quan_tam + r.khong_phu_hop + r.chua_cap_nhat, 0);

  return (
    <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
      <table style={{ ...styles.table, fontSize: 12 }}>
        <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <tr style={{ background: "#1e293b" }}>
            <th style={{ ...styles.th, color: "#fff" }}>NHÂN SỰ</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>QUAN TÂM</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>SUY NGHĨ</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right", background: "#3b82f6" }}>CHƯA CẬP NHẬT</th>
            <th style={{ ...styles.th, color: "#fff", textAlign: "right" }}>TỔNG</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row)}
          <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
            <td style={{ ...styles.td, fontWeight: 700, fontSize: 12 }}>TỔNG ({data.length})</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#16a34a" }}>{sumQt}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#d97706" }}>{sumSnt}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#2563eb", background: "#dbeafe" }}>{sumCcn}</td>
            <td style={{ ...styles.td, textAlign: "right", fontWeight: 700, fontSize: 12 }}>{sumTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const liveIndicator = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "6px 14px", borderRadius: 999,
  background: "#f0fdf4", border: "1px solid #dcfce7",
};

const periodWrap = {
  display: "flex", gap: 0, borderRadius: 10, overflow: "hidden",
  border: "1px solid #e2e8f0",
};
const periodBtn = {
  border: "none", background: "#fff", color: "#64748b",
  padding: "6px 16px", fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "all 0.2s ease",
};
const periodBtnActive = {
  background: "#f97316", color: "#fff",
};
