import { BarFrequencyChart, ChartCard, Kpi, LineTrendChart, PieStatusChart } from "../dashboard/DashboardCharts";
import { styles } from "../../styles/appStyles";

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
}) {
  const atRisk = visibleStats?.at_risk ?? 0;
  const conversionRegPct = visibleStats?.conversion_reg_pct ?? 0;
  return (
    <>
      <section style={styles.kpiGrid}>
        <Kpi title="Total Leads" value={totalLeads} tone="slate" />
        <Kpi title="Uncontacted" value={uncontacted} tone="amber" />
        <Kpi title="At risk (12-16h)" value={atRisk} tone="rose" />
        <Kpi title="Quá hạn SLA" value={overdueCount} tone="red" />
        <Kpi title="Đã liên hệ hôm nay" value={contactedToday} tone="green" />
        <Kpi title="SLA Compliance" value={`${slaCompliance.toFixed(1)}%`} tone="blue" />
        <Kpi title="Conversion (REG)" value={`${Number(conversionRegPct || 0).toFixed(1)}%`} tone="green" />
        {user.role === "admin" && visibleStats?.daily_misses_today != null && (
          <Kpi title="Số lead trễ hôm nay (UTC)" value={visibleStats.daily_misses_today} tone="rose" />
        )}
      </section>

      {overdueCount > 0 && (
        <div style={styles.banner}>
          Cảnh báo: {overdueCount} lead đang quá hạn SLA.{" "}
          <button style={styles.linkBtn} onClick={onOpenLeads}>
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
          <ChartCard title="Contact rate trend (7 ngày)">
            <LineTrendChart data={contactRate7} progress={chartProgress} />
          </ChartCard>
          <ChartCard title="Conversion trend REG (7 ngày)">
            <LineTrendChart data={conversionRate7} progress={chartProgress} />
          </ChartCard>
          <ChartCard title="Phân bổ tình trạng lead">
            <PieStatusChart total={totalLeads} contacted={Math.max(0, totalLeads - uncontacted)} overdue={overdueCount} waiting={Math.max(0, uncontacted - overdueCount)} progress={chartProgress} />
          </ChartCard>
        </div>
      </section>
    </>
  );
}
