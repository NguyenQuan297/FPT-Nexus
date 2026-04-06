const TOKEN_KEY = "lm_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

const DEFAULT_TIMEOUT_MS = 25000;

export async function apiFetch(path, opts = {}) {
  const { timeoutMs: timeoutOpt, ...fetchOpts } = opts;
  const headers = { ...fetchOpts.headers };
  const t = getToken();
  // Không gửi token cũ khi đăng nhập — tránh xung đột / nhầm lỗi
  const isLogin = String(path || "").includes("/auth/login");
  if (t && !isLogin) headers["Authorization"] = `Bearer ${t}`;
  if (fetchOpts.body && !(fetchOpts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const timeoutMs = timeoutOpt ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  let r;
  try {
    r = await fetch(path, { ...fetchOpts, headers, signal: ctrl.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        "Request timed out. Is the API running (uvicorn on port 8000) and is PostgreSQL up?"
      );
    }
    if (e instanceof TypeError && String(e.message).includes("fetch")) {
      throw new Error(
        "Cannot reach API. Use the Vite dev server (npm run dev → http://localhost:5173) or ensure the backend is running."
      );
    }
    throw e;
  } finally {
    clearTimeout(tid);
  }
  if (r.status === 401) {
    if (!path.includes("/auth/login")) setToken(null);
    let msg = "Unauthorized";
    try {
      const ct = r.headers.get("content-type");
      if (ct && ct.includes("application/json")) {
        const j = await r.json();
        if (j.detail != null) {
          msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        }
      } else {
        const txt = await r.text();
        if (txt) msg = txt;
      }
    } catch {
      // giữ msg mặc định
    }
    throw new Error(msg);
  }
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(txt || r.statusText);
  }
  if (r.status === 204) return null;
  const ct = r.headers.get("content-type");
  if (ct && ct.includes("application/json")) return r.json();
  return r.text();
}
