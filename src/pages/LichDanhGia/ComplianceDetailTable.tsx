import type { LichPhanCong } from "../../features/qlcl/types";
import { fmtVNFromDateStr } from "./dateUtils";
import { tenNguoi, type TTGroup } from "./lichHelpers";

export default function ComplianceDetailTable({
  rows,
  todayStr,
  isDone,
}: {
  rows: TTGroup[];
  todayStr: string;
  isDone: (l: LichPhanCong, dateStr: string) => boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
            <th className="px-4 py-3 font-medium">Ngày</th>
            <th className="px-4 py-3 font-medium">Khoa/Phòng</th>
            <th className="px-4 py-3 font-medium">Vị trí</th>
            <th className="px-4 py-3 font-medium">Cán bộ phụ trách</th>
            <th className="px-4 py-3 font-medium">Loại</th>
            <th className="px-4 py-3 font-medium">Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                Không có lịch trong khoảng này
              </td>
            </tr>
          )}
          {rows.map((g) => {
            const { lich: l, date } = g;
            const done = g.items.some((li) => isDone(li, date));
            const isPast = date <= todayStr;
            const isToday = date === todayStr;
            const names = g.items.map(tenNguoi).filter(Boolean);
            return (
              <tr
                key={g.key}
                className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40 ${
                  isToday ? "bg-brand-25 font-semibold dark:bg-brand-500/5" : ""
                }`}
              >
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {fmtVNFromDateStr(date)}
                  {isToday && " 📍"}
                </td>
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                  {l.khoa?.ten_khoa}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {l.vitri_type?.ten_vitri || "Tất cả"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  <div className="flex flex-wrap gap-1">
                    {names.length > 0 ? (
                      names.map((n, i) => (
                        <span
                          key={i}
                          className="inline-block rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-normal text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {n}
                        </span>
                      ))
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      l.loai_lich === "dinh_ky"
                        ? "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
                        : l.loai_lich === "dot_xuat"
                          ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}
                  >
                    {l.loai_lich === "dinh_ky"
                      ? "Định kỳ"
                      : l.loai_lich === "dot_xuat"
                        ? "Đột xuất"
                        : "Một lần"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                      done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : isPast
                          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {done
                      ? "✅ Đã đánh giá"
                      : isPast
                        ? "❌ Chưa thực hiện"
                        : "⏳ Chưa đến"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
