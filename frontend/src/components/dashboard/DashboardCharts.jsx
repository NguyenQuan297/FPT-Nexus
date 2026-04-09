import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { styles } from "../../styles/appStyles";

/** Axis label: ISO YYYY-MM-DD -> d/m or d/m/yy if not current year. */
export function formatTrendAxisLabel(day) {
  if (typeof day !== "string") return String(day);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
  if (!m) return day;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const cy = new Date().getFullYear();
  return y !== cy ? `${d}/${mo}/${String(y).slice(-2)}` : `${d}/${mo}`;
}

function ChartTooltip({ x, y, lines }) {
  if (lines == null || !lines.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: Math.min(window.innerWidth - 200, Math.max(8, x + 12)),
        top: Math.min(window.innerHeight - 100, Math.max(8, y - 8)),
        zIndex: 10001,
        pointerEvents: "none",
        background: "#fff",
        color: "#0f172a",
        padding: "8px 12px",
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.45,
        boxShadow: "0 8px 24px rgba(15,23,42,0.15)",
        border: "1px solid #e2e8f0",
        maxWidth: 220,
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ fontWeight: i === 0 ? 700 : 400 }}>
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * Click chart to zoom (modal). Esc / background / Close to exit.
 * children(zoomed: boolean)
 */
export function ZoomableChart({ chartTitle, children }) {
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => {
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setZoom(true);
          }
        }}
        onClick={() => setZoom(true)}
        style={{ cursor: "zoom-in", borderRadius: 8, outline: "none" }}
        title="Bấm để phóng to"
      >
        {children(false)}
      </div>
      {zoom && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setZoom(false)}
        >
          <div
            role="dialog"
            aria-label={chartTitle}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              maxWidth: "min(96vw, 1120px)",
              maxHeight: "92vh",
              overflow: "auto",
              boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
              <strong style={{ fontSize: 16, color: "#0f172a" }}>{chartTitle}</strong>
              <button
                type="button"
                onClick={() => setZoom(false)}
                style={{
                  ...styles.btnGhost,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                Đóng (Esc)
              </button>
            </div>
            {children(true)}
          </div>
        </div>
      )}
    </>
  );
}

/* ── KPI Card ──────────────────────────────────── */

const kpiIconColors = {
  slate:  { bg: "#f97316", icon: "#fff" },
  amber:  { bg: "#f97316", icon: "#fff" },
  red:    { bg: "#ef4444", icon: "#fff" },
  green:  { bg: "#22c55e", icon: "#fff" },
  blue:   { bg: "#8b5cf6", icon: "#fff" },
  rose:   { bg: "#ef4444", icon: "#fff" },
  purple: { bg: "#8b5cf6", icon: "#fff" },
};

const kpiIcons = {
  slate: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  amber: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  ),
  red: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  green: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  blue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  rose: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};


export function Kpi({ title, value, tone, index = 0 }) {
  const iconCfg = kpiIconColors[tone] || kpiIconColors.slate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
      style={kpiCardStyle}
    >
      <div style={{ marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconCfg.bg, display: "grid", placeItems: "center",
          color: iconCfg.icon,
          boxShadow: `0 4px 12px ${iconCfg.bg}44`,
        }}>
          {kpiIcons[tone] || kpiIcons.slate}
        </div>
      </div>
      <div style={{
        fontSize: 26, fontWeight: 800, lineHeight: 1.1,
        color: "#0f172a",
        marginBottom: 4,
      }}>
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{title}</div>
    </motion.div>
  );
}

const kpiCardStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: "16px 18px",
  boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
  border: "1px solid #f1f5f9",
  transition: "all 0.3s ease",
  cursor: "default",
  minWidth: 160,
};

/* ── Chart Card with toolbar ──────────────────── */


const chartTypeBadge = {
  Bar: { bg: "#f97316", color: "#fff" },
  Line: { bg: "#2563eb", color: "#fff" },
  Pie: { bg: "#ef4444", color: "#fff" },
};

export function ChartCard({ title, subtitle, chartType = "Bar", children }) {
  const badgeCfg = chartTypeBadge[chartType] || chartTypeBadge.Bar;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}
      style={styles.chartCard}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              background: badgeCfg.bg, color: badgeCfg.color,
            }}>
              {chartType}
            </span>
          </div>
          {subtitle && <div style={{ fontSize: 11, color: "#94a3b8" }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}


/* ── Bar Frequency Chart (orange bars) ─────────── */

export function BarFrequencyChart({
  data,
  progress,
  zoomed = false,
  tooltipSubtitle,
}) {
  const [hoverI, setHoverI] = useState(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const max = data.length ? Math.max(...data.map((d) => d.value), 1) : 1;
  const scrollWide = data.length > (zoomed ? 20 : 12);
  const colW = zoomed ? 22 : scrollWide ? 16 : undefined;
  const innerMinW = scrollWide ? data.length * ((colW || 16) + 4) : undefined;
  const barScale = zoomed ? 220 : 150;

  const onColMove = useCallback((e) => {
    setTipPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div
      style={{
        ...styles.chartBody,
        overflowX: scrollWide ? "auto" : "visible",
        width: "100%",
        minHeight: zoomed ? 320 : styles.chartBody.height,
      }}
    >
      <div
        style={{
          ...styles.barChartWrap,
          minWidth: innerMinW,
          minHeight: zoomed ? 260 : 180,
          justifyContent: scrollWide ? "flex-start" : "space-between",
          gap: scrollWide ? (zoomed ? 6 : 4) : undefined,
        }}
      >
        {data.map((d, i) => {
          const ratio = d.value / max;
          const label = formatTrendAxisLabel(d.day);
          const active = hoverI === i;
          return (
            <div
              key={`${d.day}-${i}`}
              role="presentation"
              onMouseEnter={() => setHoverI(i)}
              onMouseLeave={() => setHoverI(null)}
              onMouseMove={onColMove}
              style={{
                ...styles.trendCol,
                flex: scrollWide ? `0 0 ${colW || 14}px` : undefined,
                minWidth: scrollWide ? colW || 14 : undefined,
                opacity: hoverI != null && !active ? 0.55 : 1,
                transition: "opacity 0.15s ease",
              }}
            >
              <div
                style={{
                  ...styles.trendBar,
                  width: zoomed ? 28 : 24,
                  height: `${12 + ratio * barScale * progress}px`,
                  background: active ? "#ea580c" : "#f97316",
                  transition: "height 700ms ease, background 200ms ease",
                  borderRadius: "4px 4px 0 0",
                  boxShadow: active ? "0 0 0 2px #fb923c" : undefined,
                }}
              />
              <small
                style={{
                  fontSize: scrollWide && data.length > 40 ? (zoomed ? 9 : 8) : zoomed ? 11 : 10,
                  whiteSpace: "nowrap",
                  color: active ? "#ea580c" : "#94a3b8",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </small>
            </div>
          );
        })}
      </div>
      {hoverI != null && data[hoverI] && (
        <ChartTooltip
          x={tipPos.x}
          y={tipPos.y}
          lines={[
            `${formatTrendAxisLabel(data[hoverI].day)}`,
            `Lead : ${data[hoverI].value}`,
            ...(tooltipSubtitle ? [tooltipSubtitle] : []),
          ].filter(Boolean)}
        />
      )}
    </div>
  );
}

/* ── Line Trend Chart ──────────────────────────── */

export function LineTrendChart({ data, progress, zoomed = false, valueSuffix = "" }) {
  const height = zoomed ? 280 : 180;
  const padding = zoomed ? 24 : 18;
  const n = data.length;
  const svgRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  const pxPerSeg = zoomed ? 10 : 6;
  const width = n > 1 ? Math.max(zoomed ? 480 : 320, (n - 1) * pxPerSeg + padding * 2) : zoomed ? 480 : 320;
  const max = n ? Math.max(...data.map((d) => d.value), 1) : 1;
  const step = n > 1 ? (width - padding * 2) / (n - 1) : 0;
  const baseline = height - padding;

  const nearestIndex = useCallback(
    (clientX) => {
      if (n < 1) return 0;
      const el = svgRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const vbW = width;
      const vx = ((clientX - rect.left) / Math.max(rect.width, 1)) * vbW;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        const x = padding + i * step;
        const dist = Math.abs(vx - x);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    },
    [n, padding, step, width]
  );

  if (!n) {
    return (
      <div style={styles.chartBody}>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Không có dữ liệu</span>
      </div>
    );
  }

  const labelEvery = n > 36 ? Math.ceil(n / 18) : n > 20 ? Math.ceil(n / 14) : 1;

  const points = data
    .map((d, i) => {
      const x = padding + i * step;
      const targetY = baseline - ((height - padding * 2) * d.value) / max;
      const y = baseline - (baseline - targetY) * progress;
      return `${x},${y}`;
    })
    .join(" ");

  const onSvgMove = (e) => {
    setTipPos({ x: e.clientX, y: e.clientY });
    setHoverI(nearestIndex(e.clientX));
  };
  const onSvgLeave = () => setHoverI(null);

  return (
    <div
      style={{
        ...styles.chartBody,
        overflowX: width > (zoomed ? 500 : 400) ? "auto" : "visible",
        width: "100%",
        minHeight: zoomed ? 320 : styles.chartBody.height,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          minWidth: width > (zoomed ? 500 : 400) ? width : "100%",
          width: "100%",
          height: zoomed ? 300 : 190,
          cursor: "crosshair",
        }}
        onMouseMove={onSvgMove}
        onMouseLeave={onSvgLeave}
      >
        {/* Grid lines */}
        <line x1={padding} y1={baseline} x2={width - padding} y2={baseline} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
        <polyline
          points={points}
          fill="none"
          stroke="#2563eb"
          strokeWidth={zoomed ? 3 : 2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ transition: "all 700ms ease" }}
        />
        {data.map((d, i) => {
          const x = padding + i * step;
          const targetY = baseline - ((height - padding * 2) * d.value) / max;
          const y = baseline - (baseline - targetY) * progress;
          const showLabel = i % labelEvery === 0 || i === n - 1;
          const label = formatTrendAxisLabel(d.day);
          const hi = hoverI === i;
          return (
            <g key={`${d.day}-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={hi ? (zoomed ? 14 : 12) : zoomed ? 10 : 8}
                fill="transparent"
                style={{ cursor: "crosshair" }}
              />
              <circle
                cx={x}
                cy={y}
                r={hi ? (zoomed ? 6 : 5) : zoomed ? 4 : 3}
                fill={hi ? "#1d4ed8" : "#2563eb"}
                opacity={hi ? 1 : 0.3 + progress * 0.7}
                stroke={hi ? "#fff" : "none"}
                strokeWidth={hi ? 2 : 0}
              />
              {showLabel && (
                <text
                  x={x}
                  y={height - 2}
                  textAnchor="middle"
                  fontSize={n > 60 ? (zoomed ? 8 : 7) : zoomed ? 11 : 10}
                  fill={hi ? "#1d4ed8" : "#94a3b8"}
                  fontWeight={hi ? 700 : 400}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hoverI != null && data[hoverI] && (
        <ChartTooltip
          x={tipPos.x}
          y={tipPos.y}
          lines={[
            `${formatTrendAxisLabel(data[hoverI].day)}`,
            `Giá trị: ${data[hoverI].value}${valueSuffix}`,
          ]}
        />
      )}
    </div>
  );
}

/* ── Pie Status Chart ──────────────────────────── */

export function PieStatusChart({ total, contacted, waiting, overdue, progress, zoomed = false }) {
  const parts = [
    { label: "Đã liên hệ", value: contacted, color: "#22c55e" },
    { label: "Chưa liên hệ", value: waiting, color: "#f59e0b" },
    ...(overdue > 0 ? [{ label: "Quá hạn", value: overdue, color: "#ef4444" }] : []),
  ].filter((x) => x.value > 0);
  const radius = zoomed ? 64 : 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const svgPx = zoomed ? 220 : 170;
  return (
    <div
      style={{
        ...styles.chartBody,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: zoomed ? 20 : 16,
        minHeight: zoomed ? 280 : undefined,
      }}
    >
      <svg viewBox="0 0 160 160" style={{ width: svgPx, height: svgPx, flexShrink: 0 }}>
        <g transform="translate(80,80) rotate(-90)">
          <circle r={radius} fill="none" stroke="#f1f5f9" strokeWidth="20" />
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
                strokeWidth="20"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 700ms ease" }}
              />
            );
          })}
        </g>
        <text x="80" y="74" textAnchor="middle" fontSize="12" fill="#94a3b8" fontWeight="500">
          Tổng
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="24" fontWeight="800" fill="#0f172a">
          {total.toLocaleString("vi-VN")}
        </text>
      </svg>
      <div style={{ flex: 1 }}>
        {parts.map((part) => (
          <div key={part.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: zoomed ? 14 : 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: part.color, display: "inline-block", flexShrink: 0 }} />
            <span style={{ flex: 1, color: "#64748b" }}>{part.label}:</span>
            <strong style={{ color: "#0f172a" }}>{Math.round(part.value * progress).toLocaleString("vi-VN")}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
