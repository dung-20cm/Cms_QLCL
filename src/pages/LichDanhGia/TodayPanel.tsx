import { MapPin, Users } from "lucide-react";
import { EmptyState } from "../../components/ui/PageShell";
import { groupLich } from "../../features/qlcl/lichUtils";
import { tenNguoi } from "./lichHelpers";
import type { LichDanhGiaData } from "./useLichDanhGiaData";

// "Phân công hôm nay" -- góc nhìn CÁ NHÂN, luôn chỉ hiện lịch của khoa/phòng
// người đang đăng nhập (xem ghi chú `todayLich` trong useLichDanhGiaData.ts).
export default function TodayPanel({ lg }: { lg: LichDanhGiaData }) {
  const { today, todayLich, todayStr, isDone } = lg;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
        👤 Phân công hôm nay
        <span className="ml-1.5 text-xs font-normal text-gray-400">
          {today.toLocaleDateString("vi-VN")}
        </span>
      </h3>
      {todayLich.length === 0 ? (
        <EmptyState message="Không có lịch hôm nay" />
      ) : (
        <ul className="space-y-2">
          {groupLich(todayLich).map((g) => {
            const done = g.items.some((l) => isDone(l, todayStr));
            const names = g.items.map(tenNguoi).filter(Boolean).join(" · ");
            return (
              <li
                key={g.key}
                className={`rounded-xl border-l-4 border-y border-r p-3 ${
                  done
                    ? "border-l-emerald-500 border-y-gray-100 border-r-gray-100 bg-emerald-50/50 dark:border-y-gray-800 dark:border-r-gray-800 dark:bg-emerald-500/5"
                    : "border-l-red-500 border-y-gray-100 border-r-gray-100 bg-red-50/50 dark:border-y-gray-800 dark:border-r-gray-800 dark:bg-red-500/5"
                }`}
              >
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {g.khoa?.ten_khoa}
                </p>
                {g.vitri_type?.ten_vitri && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={11} /> {g.vitri_type.ten_vitri}
                  </p>
                )}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Users size={11} /> {names}
                </p>
                <span
                  className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    done
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                  }`}
                >
                  {done ? "✅ Đã hoàn thành" : "⏳ Chưa đánh giá"}
                </span>
                {g.ghiChu && (
                  <p className="mt-1 text-[11px] italic text-gray-400">
                    “{g.ghiChu}”
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
