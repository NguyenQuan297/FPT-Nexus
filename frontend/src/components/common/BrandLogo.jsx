/** Sidebar: PNG from /logo-nexus-sidebar.png; login: inline SVG; tab icon: index.html favicon. */
const SIDEBAR_LOGO_SRC = "/logo-nexus-sidebar.png?v=3";
function LogoSvg({ darkBg }) {
  const edu = darkBg ? "#93c5fd" : "#005DAA";
  const nexus = "#F37021";
  const schools = darkBg ? "#fdba74" : "#ea580c";
  const frameOpacity = darkBg ? 0.35 : 0.55;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 84"
      role="img"
      aria-label="FPT Nexus"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        maxHeight: darkBg ? 92 : 104,
        shapeRendering: "geometricPrecision",
        textRendering: "geometricPrecision",
      }}
    >
      <defs>
        <linearGradient id="lnx-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="318"
        height="82"
        rx="14"
        fill="none"
        stroke="url(#lnx-frame)"
        strokeWidth="1.25"
        opacity={frameOpacity}
      />
      <g transform="translate(14, 18)">
        <path d="M0 40 L9 0 L42 0 L33 40 Z" fill="#005DAA" />
        <path d="M24 40 L33 0 L66 0 L57 40 Z" fill="#F37021" />
        <path d="M48 40 L57 0 L90 0 L81 40 Z" fill="#00A651" />
        <text
          x="45"
          y="28"
          textAnchor="middle"
          fill="#fff"
          style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: 16, fontWeight: 800, fontStyle: "italic" }}
        >
          FPT
        </text>
      </g>
      <text
        x="118"
        y="30"
        fill={edu}
        style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: 11, fontWeight: 600 }}
      >
        FPT Education
      </text>
      <text
        x="118"
        y="56"
        fill={nexus}
        style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: 26, fontWeight: 800 }}
      >
        Nexus
      </text>
      <text
        x="118"
        y="74"
        fill={schools}
        style={{ fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em" }}
      >
        FPT SCHOOLS
      </text>
    </svg>
  );
}

export default function BrandLogo({ variant = "sidebar" }) {
  const isLogin = variant === "login";

  if (isLogin) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 10,
          padding: "14px 16px",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,0.25)",
          borderTop: "3px solid #F37021",
          boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
        }}
      >
        <LogoSvg darkBg={false} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
        padding: "16px 4px 18px",
        borderBottom: "1px solid rgba(148,163,184,0.15)",
        minHeight: 222,
      }}
    >
      <img
        src={SIDEBAR_LOGO_SRC}
        alt="FPT Nexus"
        width={1024}
        height={682}
        decoding="async"
        style={{
          display: "block",
          width: "auto",
          maxWidth: "100%",
          height: "auto",
          maxHeight: 204,
          objectFit: "contain",
          objectPosition: "center center",
        }}
      />
    </div>
  );
}
