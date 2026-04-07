import { useState } from "react";
import { apiFetch, setToken } from "./api";
import BrandLogo from "./components/common/BrandLogo";

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

  return (
    <div style={wrap}>
      <form style={card} onSubmit={submit}>
        <h1 style={srOnly}>FPT Nexus</h1>
        <BrandLogo variant="login" />
        <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14, textAlign: "center" }}>
          Đăng nhập vào hệ thống
        </p>
        {err && <div style={errorBox}>{err}</div>}
        <label style={label}>
          Tên đăng nhập
          <input
            style={input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label style={label}>
          Mật khẩu
          <input
            style={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" style={btn} disabled={loading}>
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16, lineHeight: 1.5 }}>
          Tài khoản quản trị mặc định sẽ được tạo khi{" "}
          <code style={{ fontSize: 11 }}>SEED_ADMIN_PASSWORD</code> được thiết lập trong backend{" "}
          <code style={{ fontSize: 11 }}>.env</code>.
          <br />
          <span style={{ color: "#64748b" }}>
            Nếu bị kẹt, hãy bật PostgreSQL, chạy API (<code style={{ fontSize: 11 }}>uvicorn app.main:app --reload</code>{" "}
            trong <code style={{ fontSize: 11 }}>backend</code>), rồi mở ứng dụng tại{" "}
            <code style={{ fontSize: 11 }}>http://localhost:5173</code> bằng Vite.
          </span>
          <br />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Bị treo? Bật PostgreSQL + backend, mở UI bằng Vite (cổng 5173), không mở file trực tiếp.
          </span>
        </p>
      </form>
    </div>
  );
}

const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

const wrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#f1f5f9",
};
const card = {
  width: "100%",
  maxWidth: 400,
  background: "#fff",
  padding: "28px 24px",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(15,23,42,0.1)",
};
const label = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, fontSize: 13, color: "#475569" };
const input = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};
const btn = {
  width: "100%",
  marginTop: 8,
  padding: "12px",
  borderRadius: 8,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 15,
};
const errorBox = {
  background: "#fef2f2",
  color: "#991b1b",
  padding: "10px 12px",
  borderRadius: 8,
  marginBottom: 14,
  fontSize: 14,
};
