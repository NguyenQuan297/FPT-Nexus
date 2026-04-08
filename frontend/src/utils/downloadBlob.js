import { getToken } from "../api";

/** GET with Bearer token; trigger browser download of CSV/XLSX blob. */
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
