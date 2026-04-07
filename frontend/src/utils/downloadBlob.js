import { getToken } from "../api";

/**
 * GET có Bearer token, tải blob và kích hoạt download trình duyệt.
 * Dùng cho export CSV/XLSX khi không đi qua apiFetch (cần raw Response/blob).
 */
export async function downloadAuthorizedBlob(url, filename) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error(await r.text());
  const blob = await r.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
