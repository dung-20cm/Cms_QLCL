import { Pencil, Trash2, Users } from "lucide-react";
import type { LichGroup } from "../../features/qlcl/lichUtils";
import type { LichPhanCong } from "../../features/qlcl/types";
import { fmt } from "./dateUtils";
import { tenNguoi } from "./lichHelpers";

// Thẻ hiển thị 1 buổi lịch — dùng chung cho lưới tuần (WeekGrid) VÀ modal "xem
// thêm" (DayDetailModal) để không lặp code.
export default function LichCard({
  g,
  d,
  today,
  isDone,
  canManageThisView,
  onEdit,
  onDelete,
}: {
  g: LichGroup;
  d: Date;
  today: Date;
  isDone: (l: LichPhanCong, dateStr: string) => boolean;
  canManageThisView: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dStr = fmt(d);
  const done = g.items.some((l) => isDone(l, dStr));
  const isPastOrToday = dStr <= fmt(today);
  const names = g.items.map(tenNguoi).filter(Boolean).join(" · ");
  return (
    <div
      className={`rounded-lg border-l-[3px] border px-2 py-1.5 text-[11px] leading-tight shadow-sm ${
        done
          ? "border-l-emerald-500 border-emerald-100 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
          : isPastOrToday
            ? "border-l-red-500 border-red-100 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
            : "border-l-sky-500 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      <p className="font-semibold text-gray-700 dark:text-gray-200">
        {done ? "✅" : isPastOrToday ? "❌" : "⏳"} {g.khoa?.ten_khoa}
      </p>
      {g.vitri_type?.ten_vitri && (
        <p className="text-gray-400">{g.vitri_type.ten_vitri}</p>
      )}
      <p className="flex items-center gap-1 text-gray-400">
        <Users size={11} /> {names}
      </p>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <span
          className={`inline-block rounded px-1 text-[10px] font-medium ${
            g.loai_lich === "dinh_ky"
              ? "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
              : g.loai_lich === "dot_xuat"
                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          }`}
        >
          {g.loai_lich === "dinh_ky"
            ? "Định kỳ"
            : g.loai_lich === "dot_xuat"
              ? "Đột xuất"
              : "Một lần"}
        </span>
        {canManageThisView && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="text-gray-300 hover:text-brand-500"
              title="Sửa"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onDelete}
              className="text-gray-300 hover:text-red-500"
              title="Xoá"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
