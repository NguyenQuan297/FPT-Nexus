import { useState } from "react";
import { motion } from "motion/react";
import { apiFetch, setToken } from "./api";
import BrandLogo from "./components/common/BrandLogo";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const uname = username.trim();
      if (!uname) throw new Error("Vui lòng nhập tên đăng nhập.");
      const data = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: uname, password }),
      });
      setToken(data.access_token);
      const me = await apiFetch("/api/v1/auth/me");
      onLoggedIn(me);
    } catch (x) {
      setErr(x.message || String(x));
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { svg: svgUsers,    title: "Quản lý lead thông minh", desc: "Theo dõi 2,247+ lead một cách có hệ thống và hiệu quả" },
    { svg: svgChart,    title: "Báo cáo SLA real-time",   desc: "Phân tích hiệu suất chuyển đổi theo thời gian thực" },
    { svg: svgTrending, title: "Dashboard trực quan",      desc: "Biểu đồ xu hướng và KPI toàn diện cho đội ngũ" },
    { svg: svgShield,   title: "Bảo mật đa cấp",          desc: "Phân quyền admin/manager/sale với bảo mật dữ liệu" },
  ];

  return (
    <div style={wrap}>
      <style>{`
        .login-input::placeholder {
          color: #94a3b8;
          opacity: 1;
        }
      `}</style>
      {/* ── Left panel ────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={leftPane}
      >
        <div style={leftBg} />
        <div className="animate-blob" style={blobA} />
        <div className="animate-blob2" style={blobB} />
        <div style={{ ...blobC, animation: "blobFloat 7s ease-in-out infinite 1.5s" }} />
        <div style={blobD} />

        <div style={leftInner}>
          {/* Logo centered at top */}
          <div style={logoSection}>
            <BrandLogo variant="login" />
          </div>

          <div style={{ maxWidth: 520, width: "100%", marginTop: 20 }}>
            {/* Platform badge - left aligned */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              style={platformBadgeWrap}
            >
              <span style={platformBadge}>
                <span style={neonIcon}>&#x26A1;</span>
                FPT NEXUS CRM PLATFORM
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={heroTitle}
            >
              Quản lý lead <span style={heroHighlight}>thông minh</span>
              <br />& chuyển đổi hiệu quả
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={heroText}
            >
              Nền tảng CRM toàn diện cho đội ngũ tư vấn tuyển sinh FPT Education — từ tiếp nhận lead đến chuyển đổi thành học sinh.
            </motion.p>

            {/* Features */}
            <div style={featureList}>
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                  style={featureRow}
                >
                  <div style={featureIconWrap}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: f.svg }} />
                  </div>
                  <div>
                    <p style={featureTitle}>{f.title}</p>
                    <p style={featureDesc}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              style={leftStats}
            >
              {[
                { value: "2,247", label: "Tổng lead" },
                { value: "100%", label: "Tỷ lệ SLA" },
                { value: "12%", label: "Chuyển đổi" },
              ].map((stat, i, arr) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  <div style={statCol}>
                    <strong style={statStrong}>{stat.value}</strong>
                    <span style={statLabel}>{stat.label}</span>
                  </div>
                  {i < arr.length - 1 && <span style={statDivider}>|</span>}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Right form panel ──────────────────── */}
      <section style={rightPane}>
        <motion.form
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          style={card}
          onSubmit={submit}
        >
          <h1 style={srOnly}>FPT Nexus</h1>
          <h3 style={title}>Đăng nhập</h3>
          <p style={subtitle}>Nhập thông tin để truy cập hệ thống</p>

          {err && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={errorBox}>
              {err}
            </motion.div>
          )}

          <label style={label}>
            Tên đăng nhập
            <input className="login-input" style={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Nhập tên đăng nhập" required />
          </label>

          <label style={label}>
            Mật khẩu
            <div style={{ position: "relative" }}>
              <input className="login-input" style={{ ...input, paddingRight: 42 }} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" required />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={eyeBtn} aria-label="toggle password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>

          <div style={{ marginBottom: 14 }} />

          <motion.button type="submit" style={btn} disabled={loading} whileHover={{ scale: 1.01, boxShadow: "0 8px 25px rgba(249,115,22,0.35)" }} whileTap={{ scale: 0.98 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={spinner} />Đang xác thực...
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                Đăng nhập <span style={{ fontSize: 16 }}>&rarr;</span>
              </span>
            )}
          </motion.button>

          <div style={divider}>
            <div style={dividerLine} />
            <span style={dividerText}>Hỗ trợ kỹ thuật</span>
            <div style={dividerLine} />
          </div>
          <p style={helpText}>
            Gặp vấn đề? Liên hệ <a href="mailto:support@fpt.edu.vn" style={{ color: "#ea580c", fontWeight: 600 }}>support@fpt.edu.vn</a> hoặc{" "}
            <span style={{ color: "#ea580c", fontWeight: 600 }}>Hotline: 1900 6600</span>
          </p>
        </motion.form>
      </section>
    </div>
  );
}

/* ── SVG icon paths ────────────────────────────── */
const svgUsers    = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
const svgChart    = '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>';
const svgTrending = '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>';
const svgShield   = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';

/* ── Styles ─────────────────────────────────────── */

const srOnly = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
};

const wrap = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "42% 58%",
  background: "#f4f6fa",
};
const leftPane = {
  position: "relative", overflow: "hidden",
  background: "linear-gradient(160deg, #0f172a 0%, #1a2540 30%, #1e293b 55%, #162032 80%, #0f172a 100%)",
  color: "#fff", display: "flex", alignItems: "stretch", justifyContent: "flex-start",
  padding: "40px 48px 40px 28px",
  fontFamily: "'Inter', system-ui, sans-serif",
};
const leftBg = {
  position: "absolute", inset: 0,
  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
  backgroundSize: "30px 30px", opacity: 0.5,
};
const blobA = {
  position: "absolute", top: -100, right: -120,
  width: 450, height: 450, borderRadius: "50%",
  background: "rgba(249,115,22,0.12)", filter: "blur(80px)", pointerEvents: "none",
};
const blobB = {
  position: "absolute", bottom: -120, left: -100,
  width: 420, height: 420, borderRadius: "50%",
  background: "rgba(59,130,246,0.1)", filter: "blur(80px)", pointerEvents: "none",
};
const blobC = {
  position: "absolute", top: "40%", left: "20%",
  width: 300, height: 300, borderRadius: "50%",
  background: "rgba(139,92,246,0.07)", filter: "blur(70px)", pointerEvents: "none",
};
const blobD = {
  position: "absolute", top: "10%", right: "30%",
  width: 250, height: 250, borderRadius: "50%",
  background: "rgba(14,165,233,0.06)", filter: "blur(60px)", pointerEvents: "none",
  animation: "blobFloat2 10s ease-in-out infinite 2s",
};
const leftInner = { position: "relative", zIndex: 1, width: "100%", maxWidth: 720, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" };

/* Logo + version centered */
const logoSection = {
  display: "flex", flexDirection: "column", alignItems: "center",
  width: "100vw", maxWidth: "42vw", paddingTop: 20,
  position: "relative", left: "50%", transform: "translateX(-42%)",
};

/* Platform badge centered with neon */
const platformBadgeWrap = {
  display: "flex", justifyContent: "flex-start", width: "100%", marginBottom: 16,
};
const platformBadge = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "6px 14px", borderRadius: 999,
  background: "rgba(249,115,22,0.1)",
  border: "1px solid rgba(249,115,22,0.3)",
  color: "#fb923c", fontSize: 13, fontWeight: 600,
  letterSpacing: "0.12em", textTransform: "uppercase",
  boxShadow: "0 0 12px rgba(249,115,22,0.2), 0 0 30px rgba(249,115,22,0.08), inset 0 0 8px rgba(249,115,22,0.06)",
  animation: "neonPulse 3s ease-in-out infinite",
};
const neonIcon = {
  fontSize: 12, filter: "drop-shadow(0 0 4px rgba(249,115,22,0.6))",
};

const heroTitle = {
  margin: "0 0 14px",
  fontSize: "2.5rem",
  lineHeight: 1.15,
  fontWeight: 700,
  letterSpacing: "-0.015em",
  maxWidth: 700,
};
const heroHighlight = {
  background: "linear-gradient(90deg, #fb923c, #f97316)",
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
};
const heroText = { color: "#94a3b8", fontSize: "1rem", lineHeight: 1.55, maxWidth: 700, marginBottom: 40 };

/* Features with circular icon containers */
const featureList = { marginTop: 4, display: "grid", gap: 16, marginBottom: 40 };
const featureRow = { color: "#e2e8f0", display: "flex", alignItems: "flex-start", gap: 10 };
const featureIconWrap = {
  width: 40, height: 40, borderRadius: 10,
  background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const featureTitle = { margin: 0, fontSize: 15, fontWeight: 600, color: "#e2e8f0" };
const featureDesc = { margin: "2px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.4 };

/* Stats */
const statCol = { display: "flex", flexDirection: "column", gap: 3 };
const statStrong = { color: "#fff", fontWeight: 700, fontSize: "1.3rem", lineHeight: 1 };
const statLabel = { color: "#64748b", fontSize: 13 };
const leftStats = {
  marginTop: 0, paddingTop: 14,
  borderTop: "1px solid rgba(148,163,184,0.15)",
  display: "flex", gap: 24,
};
const statDivider = { color: "rgba(148,163,184,0.45)", margin: "0 14px", fontWeight: 600 };

/* Right panel */
const rightPane = {
  display: "flex", alignItems: "center", justifyContent: "center",
  minHeight: "100vh", padding: 28, background: "#ffffff",
};
const card = {
  width: "100%", maxWidth: 448,
  background: "transparent", padding: "6px 8px",
  border: "none", boxShadow: "none",
};
const title = { margin: "0 0 4px", fontSize: "1.75rem", lineHeight: 1.05, fontWeight: 700, color: "#0f172a" };
const subtitle = { margin: "0 0 18px", color: "#64748b", fontSize: 14 };
const label = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, fontSize: 14, fontWeight: 600, color: "#334155" };
const input = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1px solid #d2d9e4", fontSize: 14, background: "#fff",
  color: "#0f172a",
  outline: "none", transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};
const eyeBtn = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer",
  display: "grid", placeItems: "center", fontSize: 14, padding: 4, borderRadius: 6,
};
const btn = {
  width: "100%", marginTop: 4, padding: "14px",
  borderRadius: 12, border: "none",
  background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
  color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
  boxShadow: "0 4px 16px rgba(249,115,22,0.25)", transition: "all 0.3s ease",
};
const spinner = {
  display: "inline-block", width: 16, height: 16,
  border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
  borderRadius: "50%", animation: "spin 0.6s linear infinite",
};
const errorBox = {
  background: "#fef2f2", color: "#991b1b",
  padding: "10px 14px", borderRadius: 10,
  marginBottom: 14, fontSize: 14, border: "1px solid #fecaca",
};
const divider = { display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" };
const dividerLine = { flex: 1, height: 1, background: "#e2e8f0" };
const dividerText = { fontSize: 14, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" };
const helpText = { margin: 0, fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.7 };
