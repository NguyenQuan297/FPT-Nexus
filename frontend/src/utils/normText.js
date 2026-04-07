/** Chuẩn hóa chuỗi để so khớp tên hiển thị / gán lead (không phân biệt hoa thường, gộp khoảng trắng). */
export function normText(v) {
  return String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
