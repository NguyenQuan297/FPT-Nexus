import { styles } from "../../styles/appStyles";

export default function ReportsTab({
  repY,
  setRepY,
  repM,
  setRepM,
  worstMinDays,
  setWorstMinDays,
  worstMaxDays,
  setWorstMaxDays,
  loadReport,
  downloadReportExport,
  setErr,
  report,
}) {
  const topVolume = report?.by_sale?.length
    ? [...report.by_sale].sort((a, b) => b.total_leads - a.total_leads)[0]
    : null;
  return (
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 12 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>KPI: Tổng lead tạo mới</div>
              <strong style={{ fontSize: 22 }}>{report.total_leads_created}</strong>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>KPI: Lead trễ</div>
              <strong style={{ fontSize: 22 }}>{report.overdue_leads}</strong>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>KPI: SLA Compliance</div>
              <strong style={{ fontSize: 22 }}>{report.sla_compliance_pct}%</strong>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Ranking: Sale có volume cao nhất</div>
              <strong style={{ fontSize: 16 }}>{topVolume?.assignee || "-"}</strong>
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 18 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Bảng SLA theo người phụ trách</h4>
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Người phụ trách</th><th style={styles.th}>Số lead</th><th style={styles.th}>Số lead trễ</th><th style={styles.th}>Tỷ lệ đạt SLA</th></tr></thead>
                <tbody>{report.by_sale.map((s) => <tr key={s.assignee}><td style={styles.td}>{s.assignee}</td><td style={styles.td}>{s.total_leads}</td><td style={styles.td}>{s.overdue_leads}</td><td style={styles.td}>{s.sla_compliance_pct.toFixed(1)}%</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginTop: 8 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Bảng phân tích tỷ lệ chuyển đổi</h4>
            <div style={styles.tableScroll}>
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
            </div>
          </div>
        </>
      )}
    </section>
  );
}
