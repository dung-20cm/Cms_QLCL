// "YYYY-MM-DD" (hoặc ISO datetime) -> "dd/mm/yyyy" hiển thị trong Excel --
// cùng cách format "vi-VN" đã dùng ở TongHop/useTongHopData.ts.
export function fmtDateVN(value: string | number | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN");
}

// "YYYY-MM-DD" -> "dd/mm/yyyy" dùng cho tên file xuất ra.
export function fmtDateFileName(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}
