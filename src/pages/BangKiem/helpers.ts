import type { ChecklistItem, LichPhanCong } from "../../features/qlcl/types";
import type { SGroup } from "./types";

export function groupByS(items: ChecklistItem[]): SGroup[] {
  const map = new Map<string, SGroup>();
  for (const it of items) {
    if (!map.has(it.s_id)) {
      map.set(it.s_id, {
        s_id: it.s_id,
        s_name: it.s_name,
        s_color: it.s_color,
        s_lt: it.s_lt,
        items: [],
      });
    }
    map.get(it.s_id)!.items.push(it);
  }
  return [...map.values()];
}

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const fmtVN = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("vi-VN");

// Mốc ngày bắt đầu áp dụng thực tế của 1 lịch định kỳ -- xem cùng logic ở
// LichDanhGia.tsx (effectiveStartDate) để 2 trang luôn tính khớp nhau.
export function effectiveStartDate(l: LichPhanCong): string | null {
  if (l.ngay_thuc_hien) return l.ngay_thuc_hien;
  return l.createdAt ? l.createdAt.slice(0, 10) : null;
}

// 1 lịch có áp dụng cho đúng ngày `dateStr` hay không -- định kỳ lặp theo thứ
// trong tuần kể từ effectiveStartDate, một lần/đột xuất phải khớp đúng ngày.
export function lichMatchesDate(l: LichPhanCong, dateStr: string): boolean {
  if (l.loai_lich === "dinh_ky") {
    const thu = new Date(`${dateStr}T00:00:00`).getDay();
    const thuNum = thu === 0 ? 7 : thu;
    if (l.thu_trong_tuan !== thuNum) return false;
    const startBound = effectiveStartDate(l);
    return !startBound || dateStr >= startBound;
  }
  return l.ngay_thuc_hien === dateStr;
}
