// Thứ 2 đầu tuần của 1 ngày bất kỳ
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
// "YYYY-MM-DD" theo GIỜ ĐỊA PHƯƠNG (không dùng toISOString() vì lệch UTC)
export const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const fmtVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
export function mondayOf(d: Date): string {
  return fmt(startOfWeek(d));
}

export function clBadge(cl: string) {
  const v = cl?.toLowerCase() || "";
  if (v.includes("tốt") || v === "tot")
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (
    v.includes("trung") ||
    v.includes("kha") ||
    v.includes("khá") ||
    v === "tb"
  )
    return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
}
