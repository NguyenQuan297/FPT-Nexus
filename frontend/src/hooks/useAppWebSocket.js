import { useEffect, useRef } from "react";
import { apiFetch, getToken } from "../api";
import { renderEventText } from "../utils/leadUiHelpers";

/** Realtime WebSocket: refresh data and toasts on server events. */
export function useAppWebSocket({
  user,
  tab,
  load,
  loadNotifs,
  loadSyncMeta,
  loadReport,
  loadAssignees,
  setToasts,
}) {
  const loadDebounceRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const t = getToken();
    if (!t) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/v1/realtime/ws?token=${encodeURIComponent(t)}`);
    ws.onopen = () => {
      try {
        ws.send("ping");
      } catch {
        /* ignore */
      }
    };
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type && data.type !== "system.connected" && data.type !== "system.pong") {
          setToasts((prev) => [...prev.slice(-3), { id: Date.now() + Math.random(), text: renderEventText(data) }]);
          if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
          loadDebounceRef.current = setTimeout(() => {
            loadDebounceRef.current = null;
            load().catch(() => {});
          }, 500);
          if (data.type === "notification.created" && user.role === "sale" && tab === "notifications") {
            apiFetch("/api/v1/notifications/read-all", { method: "POST" })
              .then(() => loadNotifs())
              .catch(() => {});
          } else {
            loadNotifs();
          }
          if (tab === "reports" && user.role === "admin") loadReport();
          if (data.type === "excel_sync.updated" && user.role === "admin") loadSyncMeta();
          if (user.role === "admin" && data.type?.startsWith("lead.")) loadAssignees();
        }
      } catch {
        /* ignore malformed */
      }
    };
    const pingId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send("ping");
        } catch {
          /* ignore */
        }
      }
    }, 25000);
    const removeToast = setInterval(() => setToasts((prev) => prev.slice(1)), 5000);
    return () => {
      if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
      clearInterval(pingId);
      clearInterval(removeToast);
      ws.close();
    };
  }, [user, tab, load, loadNotifs, loadSyncMeta, loadReport, loadAssignees, setToasts]);
}
