import { barColor, styles, toneColor } from "../../styles/appStyles";

export function Kpi({ title, value, tone }) {
  return (
    <div style={{ ...styles.kpiCard, borderTop: `3px solid ${toneColor(tone)}` }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export function ChartCard({ title, children }) {
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      {children}
    </div>
  );
}

export function BarFrequencyChart({ data, progress }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={styles.chartBody}>
      <div style={styles.barChartWrap}>
        {data.map((d) => {
          const ratio = d.value / max;
          return (
            <div key={d.day} style={styles.trendCol}>
              <div
                style={{
                  ...styles.trendBar,
                  height: `${12 + ratio * 150 * progress}px`,
                  background: barColor(ratio),
                  transition: "height 700ms ease, background 700ms ease",
                }}
              />
              <small>{d.day}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineTrendChart({ data, progress }) {
  const width = 320;
  const height = 180;
  const padding = 18;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const baseline = height - padding;
  const points = data
    .map((d, i) => {
      const x = padding + i * step;
      const targetY = baseline - ((height - padding * 2) * d.value) / max;
      const y = baseline - (baseline - targetY) * progress;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div style={styles.chartBody}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 190 }}>
        <line x1={padding} y1={baseline} x2={width - padding} y2={baseline} stroke="#cbd5e1" strokeWidth="1" />
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ transition: "all 700ms ease" }}
        />
        {data.map((d, i) => {
          const x = padding + i * step;
          const targetY = baseline - ((height - padding * 2) * d.value) / max;
          const y = baseline - (baseline - targetY) * progress;
          return (
            <g key={d.day}>
              <circle cx={x} cy={y} r={4} fill="#2563eb" opacity={0.3 + progress * 0.7} />
              <text x={x} y={height - 2} textAnchor="middle" fontSize="10" fill="#64748b">
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function PieStatusChart({ total, contacted, waiting, overdue, progress }) {
  const parts = [
    { label: "Đã liên hệ", value: contacted, color: "#16a34a" },
    { label: "Chưa liên hệ", value: waiting, color: "#f59e0b" },
    { label: "Quá hạn", value: overdue, color: "#dc2626" },
  ].filter((x) => x.value > 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div style={{ ...styles.chartBody, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <svg viewBox="0 0 160 160" style={{ width: 170, height: 170 }}>
        <g transform="translate(80,80) rotate(-90)">
          <circle r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" />
          {parts.map((part) => {
            const ratio = total ? part.value / total : 0;
            const seg = circumference * ratio * progress;
            const dashArray = `${seg} ${circumference - seg}`;
            const dashOffset = -offset;
            offset += circumference * ratio;
            return (
              <circle
                key={part.label}
                r={radius}
                fill="none"
                stroke={part.color}
                strokeWidth="18"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 700ms ease" }}
              />
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" fontSize="14" fill="#64748b">
          Tổng
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">
          {Math.round(total * progress)}
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        {parts.map((part) => (
          <div key={part.label} style={styles.legendRow}>
            <span style={{ ...styles.legendDot, background: part.color }} />
            <span style={{ flex: 1 }}>{part.label}</span>
            <strong>{Math.round(part.value * progress)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
