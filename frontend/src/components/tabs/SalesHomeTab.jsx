import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { styles } from "../../styles/appStyles";
import { formatDt } from "../../utils/leadUiHelpers";
import { BarFrequencyChart, ChartCard, LineTrendChart, ZoomableChart } from "../dashboard/DashboardCharts";

export default function SalesHomeTab({
  stats,
  trend7,
  contactRate7,
  conversionRate7,
  chartProgress,
  onOpenMyLeads,
  onOpenOverdueLeads,
}) {
  const [priority, setPriority] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/v1/leads/query?overdue_only=true&limit=8&page=1")
      .then((r) => {
        if (!cancelled) setPriority(r.items || []);
      })
      .catch(() => {
        if (!cancelled) setPriority([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = stats?.total_leads ?? 0;
  const uncontacted = stats?.uncontacted ?? 0;
  const overdue = stats?.overdue ?? 0;
  const contactedToday = stats?.contacted_today ?? 0;
  const reg = stats?.conversion_reg_pct ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Trang chủ — KPI của bạn</h3>
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Lead của tôi</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{total}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Chưa liên hệ</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#ca8a04" }}>{uncontacted}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Quá hạn SLA</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: overdue ? "#b91c1c" : "#16a34a" }}>{overdue}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Đã liên hệ hôm nay</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{contactedToday}</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tỷ lệ REG</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{reg}%</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={styles.btn} onClick={onOpenMyLeads}>
            Mở Leads của tôi
          </button>
          {overdue > 0 && (
            <button type="button" style={styles.btnGhost} onClick={onOpenOverdueLeads}>
              Xem lead quá hạn ({overdue})
            </button>
          )}
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Ưu tiên xử lý (quá hạn)</h3>
        {priority.length === 0 ? (
          <p style={{ color: "#64748b" }}>Không có lead quá hạn trong danh sách — tốt lắm.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155" }}>
            {priority.map((L) => (
              <li key={L.id} style={{ marginBottom: 8 }}>
                <strong>{L.name || L.phone || "Khách"}</strong>
                {L.phone ? ` · ${L.phone}` : ""}
                <span style={{ color: "#94a3b8", fontSize: 13 }}> · tạo {formatDt(L.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Gợi ý việc hôm nay</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#475569" }}>
          <li>Gọi / nhắn các lead chưa liên hệ ({uncontacted}).</li>
          <li>Xử lý trước các lead quá hạn SLA ({overdue}).</li>
          <li>Ghi chú sau mỗi cuộc gọi trong Leads của tôi.</li>
        </ul>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Xu hướng 7 ngày</h3>
        <p style={{ marginTop: -6, marginBottom: 10, fontSize: 12, color: "#64748b" }}>
          Bấm vào biểu đồ để phóng to; đưa chuột lên cột hoặc đường để xem số liệu.
        </p>
        <div style={styles.dashboardCharts}>
          <ChartCard title="Lead mới / ngày">
            <ZoomableChart chartTitle="Lead mới / ngày (sale)">
              {(z) => (
                <div style={{ opacity: chartProgress ? 1 : 0.25, transition: "opacity 0.35s ease" }}>
                  <BarFrequencyChart
                    data={trend7}
                    progress={chartProgress}
                    zoomed={z}
                    formatTooltipValue={(d) => `Số lead mới: ${d.value}`}
                  />
                </div>
              )}
            </ZoomableChart>
          </ChartCard>
          <ChartCard title="Tỷ lệ liên hệ (%)">
            <ZoomableChart chartTitle="Tỷ lệ liên hệ (%) — sale">
              {(z) => (
                <div style={{ opacity: chartProgress ? 1 : 0.25, transition: "opacity 0.35s ease" }}>
                  <LineTrendChart data={contactRate7} progress={chartProgress} zoomed={z} valueSuffix="%" />
                </div>
              )}
            </ZoomableChart>
          </ChartCard>
          <ChartCard title="Chuyển đổi REG (%)">
            <ZoomableChart chartTitle="Chuyển đổi REG (%) — sale">
              {(z) => (
                <div style={{ opacity: chartProgress ? 1 : 0.25, transition: "opacity 0.35s ease" }}>
                  <LineTrendChart data={conversionRate7} progress={chartProgress} zoomed={z} valueSuffix="%" />
                </div>
              )}
            </ZoomableChart>
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
