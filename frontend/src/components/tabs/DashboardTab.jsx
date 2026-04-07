import {
  BarFrequencyChart,
  ChartCard,
  Kpi,
  LineTrendChart,
  PieStatusChart,
  ZoomableChart,
} from "../dashboard/DashboardCharts";
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
        <Kpi title="Tổng lead" value={totalLeads} tone="slate" />
        <Kpi title="Chưa liên hệ" value={uncontacted} tone="amber" />
        <Kpi title="Sắp quá hạn (12-16h)" value={atRisk} tone="rose" />
        <Kpi title="Quá hạn SLA" value={overdueCount} tone="red" />
        <Kpi title="Đã liên hệ hôm nay" value={contactedToday} tone="green" />
        <Kpi title="Tỷ lệ đạt SLA" value={`${slaCompliance.toFixed(1)}%`} tone="blue" />
        <Kpi title="Tỷ lệ chuyển đổi (REG)" value={`${Number(conversionRegPct || 0).toFixed(1)}%`} tone="green" />
        {user.role === "admin" && visibleStats?.daily_misses_today != null && (
          <Kpi title="Số lead trễ hôm nay" value={visibleStats.daily_misses_today} tone="rose" />
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
        <h3>Xu hướng theo ngày (từ ngày có dữ liệu đến hiện tại)</h3>
        <p style={{ marginTop: -6, marginBottom: 10, fontSize: 12, color: "#64748b" }}>
          Bấm vào biểu đồ để phóng to; đưa chuột để xem số liệu từng ngày (cột / đường).
        </p>
        <div style={styles.dashboardCharts}>
          <ChartCard title="Tần suất lead theo ngày">
            <ZoomableChart chartTitle="Tần suất lead theo ngày">
              {(z) => (
                <BarFrequencyChart
                  data={trend7}
                  progress={chartProgress}
                  zoomed={z}
                  formatTooltipValue={(d) => `Số lead mới: ${d.value}`}
                />
              )}
            </ZoomableChart>
          </ChartCard>
          <ChartCard title="Xu hướng tỷ lệ liên hệ theo ngày">
            <ZoomableChart chartTitle="Xu hướng tỷ lệ liên hệ theo ngày">
              {(z) => (
                <LineTrendChart data={contactRate7} progress={chartProgress} zoomed={z} valueSuffix="%" />
              )}
            </ZoomableChart>
          </ChartCard>
          <ChartCard title="Xu hướng chuyển đổi REG theo ngày">
            <ZoomableChart chartTitle="Xu hướng chuyển đổi REG theo ngày">
              {(z) => (
                <LineTrendChart data={conversionRate7} progress={chartProgress} zoomed={z} valueSuffix="%" />
              )}
            </ZoomableChart>
          </ChartCard>
          <ChartCard title="Phân bổ tình trạng lead">
            <ZoomableChart chartTitle="Phân bổ tình trạng lead">
              {(z) => (
                <PieStatusChart
                  total={totalLeads}
                  contacted={Math.max(0, totalLeads - uncontacted)}
                  overdue={overdueCount}
                  waiting={Math.max(0, uncontacted - overdueCount)}
                  progress={chartProgress}
                  zoomed={z}
                />
              )}
            </ZoomableChart>
          </ChartCard>
        </div>
      </section>
    </>
  );
}
