export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=CN
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
// Dùng ngày/tháng/năm THEO GIỜ ĐỊA PHƯƠNG — không dùng toISOString() vì nó quy
// đổi sang UTC, dễ lệch 1 ngày so với lịch thực tế (VN là UTC+7).
export const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const fmtVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
// "YYYY-MM-DD" (từ backend) -> "DD/MM" để hiển thị, tránh lồng template literal
export function fmtVNFromDateStr(s: string): string {
  return fmtVN(new Date(`${s}T00:00:00`));
}

// Bỏ dấu tiếng Việt để gõ tên không dấu vẫn lọc được (VD: "phuong" khớp "Phương")
export function boDauVN(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
