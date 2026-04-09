const TOKEN_KEY = "lm_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Default for JSON/API calls (EC2 + large datasets can exceed a few seconds). */
export const TIMEOUT_DEFAULT_MS = 60000;
/** Excel upload + server ingest can take minutes on large files or small instances. */
export const TIMEOUT_UPLOAD_MS = 600000;
/** Regenerate synced workbook / heavy server work. */
export const TIMEOUT_SYNC_MS = 300000;
/** Bulk lead actions on many rows. */
export const TIMEOUT_BULK_MS = 180000;

const IS_DEV = import.meta.env.DEV;
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || "").trim();
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalHost(hostname) {
  return LOCAL_HOSTS.has(String(hostname || "").toLowerCase());
}

function resolveApiBase() {
  if (!RAW_API_BASE || typeof window === "undefined") return "";
  try {
    const cfg = new URL(RAW_API_BASE);
    const current = window.location;
    // Guard against stale prod builds configured with localhost API.
    if (!isLocalHost(current.hostname) && isLocalHost(cfg.hostname)) {
      return current.origin;
    }
    return `${cfg.protocol}//${cfg.host}`;
  } catch {
    return "";
  }
}

const API_BASE = resolveApiBase();

function resolveApiUrl(path) {
  const raw = String(path || "");
  if (!raw) return raw;
  if (!API_BASE) return raw;
  // Absolute URLs are only rewritten when they incorrectly point to localhost
  // while the app is running on a remote host.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (typeof window !== "undefined" && !isLocalHost(window.location.hostname) && isLocalHost(u.hostname)) {
        return `${window.location.origin}${u.pathname}${u.search}${u.hash}`;
      }
    } catch {
      // keep original if malformed
    }
    return raw;
  }
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw}`;
}

export async function apiFetch(path, opts = {}) {
  const { timeoutMs: timeoutOpt, ...fetchOpts } = opts;
  const headers = { ...fetchOpts.headers };
  const t = getToken();
  // Omit Bearer token on login to avoid stale-token conflicts
  const isLogin = String(path || "").includes("/auth/login");
  if (t && !isLogin) headers["Authorization"] = `Bearer ${t}`;
  if (fetchOpts.body && !(fetchOpts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const timeoutMs = timeoutOpt ?? TIMEOUT_DEFAULT_MS;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  let r;
  try {
    r = await fetch(resolveApiUrl(path), { ...fetchOpts, headers, signal: ctrl.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        IS_DEV
          ? "Request timed out. Is the API on :8000 up and PostgreSQL running? Large Excel uploads need a longer wait — try again or a smaller file."
          : "Request timed out. The server may still be processing a large upload — wait and refresh. If it persists, check EC2 Security Group (port 8000), that the app container is healthy, and PostgreSQL is up."
      );
    }
    if (e instanceof TypeError && String(e.message).includes("fetch")) {
      throw new Error(
        IS_DEV
          ? "Cannot reach API. Run `npm run dev` (Vite) and ensure the backend is on http://127.0.0.1:8000."
          : "Cannot reach API. Open the app at the same host as the API (e.g. http://YOUR_SERVER_IP:8000), not a separate static host unless it proxies /api. Check Security Group/firewall for port 8000 and that Docker containers are running."
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
      // keep default msg
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
