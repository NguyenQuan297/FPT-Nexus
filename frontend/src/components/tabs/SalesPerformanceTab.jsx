import { styles } from "../../styles/appStyles";

export default function SalesPerformanceTab({
  stats,
  trend7,
  contactRate7,
  conversionRate7,
  chartProgress,
}) {
  const total = stats?.total_leads ?? 0;
  const overdue = stats?.overdue ?? 0;
  const contactedToday = stats?.contacted_today ?? 0;
  const reg = stats?.conversion_reg_pct ?? 0;
  const contactRate = total ? Math.round(((total - (stats?.uncontacted ?? 0)) / total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Hiệu suất cá nhân</h3>
        <p style={{ color: "#64748b", fontSize: 14 }}>Số liệu theo lead được gán cho bạn (không lẫn sale khác).</p>
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tổng lead</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{total}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tỷ lệ đã chạm (ước lượng)</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{contactRate}%</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>REG</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{reg}%</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Liên hệ hôm nay</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{contactedToday}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Quá hạn cần xử lý</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: overdue ? "#b91c1c" : "#16a34a" }}>{overdue}</div>
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Biểu đồ 7 ngày</h3>
        <div style={styles.dashboardCharts}>
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Lead / ngày</div>
            <div style={styles.chartBody}>
              <div style={{ ...styles.barChartWrap, opacity: chartProgress ? 1 : 0.25 }}>
                {trend7.map((p) => (
                  <div key={p.day} style={styles.trendCol}>
                    <div
                      style={{
                        ...styles.trendBar,
                        height: `${Math.min(100, (p.value / (Math.max(...trend7.map((x) => x.value), 1) || 1)) * 100)}%`,
                        minHeight: p.value ? 8 : 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{p.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Tỷ lệ liên hệ %</div>
            <div style={styles.chartBody}>
              <div style={{ ...styles.barChartWrap, opacity: chartProgress ? 1 : 0.25 }}>
                {contactRate7.map((p) => (
                  <div key={p.day} style={styles.trendCol}>
                    <div
                      style={{
                        ...styles.trendBar,
                        height: `${Math.min(100, p.value)}%`,
                        background: "#86efac",
                        minHeight: p.value ? 8 : 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{p.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={styles.chartCard}>
            <div style={styles.chartTitle}>Chuyển REG %</div>
            <div style={styles.chartBody}>
              <div style={{ ...styles.barChartWrap, opacity: chartProgress ? 1 : 0.25 }}>
                {conversionRate7.map((p) => (
                  <div key={p.day} style={styles.trendCol}>
                    <div
                      style={{
                        ...styles.trendBar,
                        height: `${Math.min(100, p.value)}%`,
                        background: "#93c5fd",
                        minHeight: p.value ? 8 : 0,
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#64748b" }}>{p.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
