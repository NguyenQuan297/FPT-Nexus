import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../api";
import { formatDt } from "../../utils/leadUiHelpers";
import { styles } from "../../styles/appStyles";

const inputFull = { ...styles.input, minWidth: 280, width: "100%", maxWidth: 520, boxSizing: "border-box" };

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export default function SettingsTab({ user, syncMeta, runExcelSync, downloadLatestSync, setErr }) {
  const [tgChat, setTgChat] = useState("");
  const [tgWidget, setTgWidget] = useState({
    available: false,
    bot_username: "",
    has_bot_token: false,
    username_resolve_failed: false,
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const widgetMountRef = useRef(null);
  const handlersRef = useRef({ setErr, setNotifMsg, setTgChat });
  handlersRef.current = { setErr, setNotifMsg, setTgChat };

  const loadNotifChannels = useCallback(async () => {
    if (user?.role !== "admin") return;
    setNotifLoading(true);
    setNotifMsg(null);
    try {
      const [w, ch] = await Promise.all([
        apiFetch("/api/v1/settings/telegram-widget"),
        apiFetch("/api/v1/settings/notification-channels"),
      ]);
      setTgWidget({
        available: !!w.widget_available,
        bot_username: (w.bot_username || "").trim(),
        has_bot_token: !!w.has_bot_token,
        username_resolve_failed: !!w.username_resolve_failed,
      });
      setTgChat(ch.telegram_chat_id || "");
      if (!w.widget_available) setShowManual(true);
      else setShowManual(false);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setNotifLoading(false);
    }
  }, [user?.role, setErr]);

  useEffect(() => {
    loadNotifChannels();
  }, [loadNotifChannels]);

  useEffect(() => {
    if (notifLoading || !tgWidget.available || !tgWidget.bot_username) return undefined;
    const el = widgetMountRef.current;
    if (!el) return undefined;

    const onAuth = async (tgUser) => {
      const { setErr: se, setNotifMsg: sm, setTgChat: st } = handlersRef.current;
      try {
        const data = await apiFetch("/api/v1/settings/telegram-link", {
          method: "POST",
          body: JSON.stringify(tgUser),
        });
        st(data.telegram_chat_id || "");
        sm({
          tone: "ok",
          text: "Đã liên kết tài khoản Telegram — bạn sẽ nhận thông báo qua bot.",
        });
      } catch (err) {
        se(String(err.message || err));
      }
    };

    window.onTelegramAuth = onAuth;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", tgWidget.bot_username);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    el.appendChild(script);

    return () => {
      el.innerHTML = "";
      if (window.onTelegramAuth === onAuth) delete window.onTelegramAuth;
    };
  }, [notifLoading, tgWidget.available, tgWidget.bot_username]);

  const saveNotifChannels = async () => {
    setNotifSaving(true);
    setNotifMsg(null);
    try {
      const data = await apiFetch("/api/v1/settings/notification-channels", {
        method: "PUT",
        body: JSON.stringify({
          telegram_chat_id: tgChat.trim() || null,
        }),
      });
      setTgChat(data.telegram_chat_id || "");
      setNotifMsg({ tone: "ok", text: "Đã lưu chat_id thủ công." });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setNotifSaving(false);
    }
  };

  const testNotify = async () => {
    setNotifMsg(null);
    try {
      const res = await apiFetch("/api/v1/system/test-admin-notify", { method: "POST" });
      if (!res.telegram_ok) {
        setErr(res.message || "Telegram không nhận tin nhắn.");
        return;
      }
      setNotifMsg({ tone: "ok", text: res.message || "Đã gửi tin nhắn test." });
    } catch (e) {
      setErr(String(e.message || e));
    }
  };

  const onLocalhost = isLocalhost();

  return (
    <>
      <section style={styles.card}>
        <h3>Cài đặt hệ thống</h3>
        {user.role === "admin" ? (
          <>
            <p>
              Trạng thái đồng bộ Excel: <strong>{syncMeta?.status || "không rõ"}</strong>
            </p>
            <p>Cập nhật lần cuối: {syncMeta?.last_updated ? formatDt(syncMeta.last_updated) : "-"}</p>
            <p>Tệp hiện tại: {syncMeta?.filename || "-"}</p>
            <p style={{ color: "#475569", marginTop: -6 }}>
              Tải xuống tại đây sẽ giữ nguyên template gốc (màu, cột, thứ tự) và chỉ cập nhật cột trạng thái gọi điện.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={styles.btn} onClick={runExcelSync}>
                Đồng bộ ngay
              </button>
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => downloadLatestSync().catch((e) => setErr(String(e)))}
              >
                Tải file Excel mới nhất
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: "#64748b" }}>Bạn không có quyền xem mục cài đặt này.</p>
        )}
      </section>

      {user.role === "admin" && (
        <section style={styles.card}>
          <h3>Thông báo Telegram</h3>

          {tgChat ? (
            <p style={{ fontSize: 14, color: "#166534", marginBottom: 12, lineHeight: 1.5 }}>
              <strong>Đã cấu hình nhận tin:</strong> thông báo hệ thống gửi tới Telegram id <strong>{tgChat}</strong>.
              Bạn có thể bấm «Gửi tin nhắn thử» để kiểm tra.
            </p>
          ) : (
            <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
              Cần <code>TELEGRAM_BOT_TOKEN</code> trong <code>backend/.env</code> (token từ @BotFather). Sau đó hoặc{" "}
              <strong>bấm nút liên kết</strong> (khi chạy trên web HTTPS đã khai báo trong BotFather) hoặc{" "}
              <strong>nhập chat_id</strong> bên dưới — cả hai đều dùng được; không bắt buộc cả hai.
            </p>
          )}

          {notifLoading ? (
            <p style={{ color: "#64748b" }}>Đang tải cấu hình…</p>
          ) : (
            <>
              {!tgWidget.has_bot_token && (
                <p style={{ color: "#991b1b", background: "#fef2f2", padding: 10, borderRadius: 8, fontSize: 14 }}>
                  Chưa có <code>TELEGRAM_BOT_TOKEN</code> trên server — thêm vào <code>backend/.env</code>, khởi động lại
                  API, rồi tải lại trang này.
                </p>
              )}

              {tgWidget.has_bot_token && tgWidget.username_resolve_failed && (
                <p style={{ color: "#9a3412", background: "#fff7ed", padding: 10, borderRadius: 8, fontSize: 14 }}>
                  Không lấy được tên bot từ Telegram (getMe). Kiểm tra token đúng chưa, hoặc thêm tùy chọn{" "}
                  <code>TELEGRAM_BOT_USERNAME</code> (tên bot không có @) vào <code>.env</code>.
                </p>
              )}

              {tgWidget.available && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Liên kết bằng tài khoản Telegram</p>
                  {onLocalhost && (
                    <p style={{ color: "#1e40af", background: "#eff6ff", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 10 }}>
                      Bạn đang mở app bằng <strong>localhost</strong>: sau khi bấm đăng nhập, Telegram có thể báo lỗi domain
                      vì chưa có HTTPS + domain đã khai báo trong BotFather (<code>/setdomain</code>). Trên máy dev, cách
                      chắc chắn là nhập <strong>chat_id</strong> ở mục bên dưới; khi deploy lên site HTTPS hãy dùng nút này.
                    </p>
                  )}
                  {!onLocalhost && (
                    <p style={{ color: "#475569", fontSize: 13, marginBottom: 8 }}>
                      Đảm bảo trong BotFather đã chạy <code>/setdomain</code> với đúng domain trang này (HTTPS).
                    </p>
                  )}
                  <div ref={widgetMountRef} />
                </div>
              )}

              <details
                style={{ marginTop: 12, marginBottom: 12 }}
                open={showManual}
                onToggle={(e) => setShowManual(e.target.open)}
              >
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#334155" }}>
                  {tgChat ? "Đổi chat_id (nhập tay)" : "Nhập chat_id thủ công (ổn định trên localhost)"}
                </summary>
                <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                  Mở Telegram → tìm bot → gửi <code>/start</code> → lấy số id (hoặc dùng bot @userinfobot). Dán vào đây,
                  không cần nút liên kết phía trên.
                </p>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Telegram chat_id</label>
                <input
                  style={{ ...inputFull, marginBottom: 12 }}
                  value={tgChat}
                  onChange={(e) => setTgChat(e.target.value)}
                  placeholder="Ví dụ: 123456789"
                  autoComplete="off"
                />
                <button type="button" style={styles.btn} disabled={notifSaving} onClick={saveNotifChannels}>
                  {notifSaving ? "Đang lưu…" : "Lưu chat_id"}
                </button>
              </details>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <button type="button" style={styles.btnGhost} onClick={testNotify}>
                  Gửi tin nhắn thử
                </button>
              </div>
              {notifMsg && (
                <p style={{ marginTop: 10, color: notifMsg.tone === "ok" ? "#166534" : "#991b1b", fontSize: 14 }}>
                  {notifMsg.text}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
