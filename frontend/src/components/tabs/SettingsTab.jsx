import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { formatDt } from "../../utils/leadUiHelpers";
import { styles } from "../../styles/appStyles";

const inputFull = { ...styles.input, minWidth: 280, width: "100%", maxWidth: 520, boxSizing: "border-box" };

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 140px)",
      }}
    >
      <section style={styles.card}>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Cài đặt hệ thống</h3>
        {user.role === "admin" ? (
          <>
            <p>
              Trạng thái đồng bộ Excel: <strong>{syncMeta?.status || "không rõ"}</strong>
            </p>
            <p>Cập nhật lần cuối: {syncMeta?.last_updated ? formatDt(syncMeta.last_updated) : "-"}</p>
            <p>Tệp hiện tại: {syncMeta?.filename || "-"}</p>
            {syncMeta?.template_error ? (
              <p style={{ color: "#b91c1c", marginTop: 4, fontSize: 13 }}>{syncMeta.template_error}</p>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
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
          <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Thông báo Telegram</h3>

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

              {tgWidget.has_bot_token && tgWidget.bot_username && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Liên kết bằng tài khoản Telegram</p>
                  <a
                    href={`https://t.me/${tgWidget.bot_username}`}
                    target="_blank"
                    rel="noreferrer"
                    style={tgLinkBtn}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Mở Bot Telegram
                  </a>
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

    </div>
  );
}

const tgLinkBtn = {
  display: "inline-flex", alignItems: "center", gap: 10,
  padding: "10px 20px", borderRadius: 10,
  background: "#0088cc", color: "#fff",
  fontSize: 14, fontWeight: 700, textDecoration: "none",
  cursor: "pointer", transition: "background 0.2s ease",
};
