/** Lowercase, trim, collapse spaces — for assignee/display matching. */
export function normText(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
