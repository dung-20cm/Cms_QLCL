import { ChevronLeft, ChevronRight } from "lucide-react";
import { btnSecondary, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { groupLich } from "../../features/qlcl/lichUtils";
import { DAY_VISIBLE_LIMIT, THU_LABEL } from "./constants";
import { fmt, fmtVN, startOfWeek } from "./dateUtils";
import LichCard from "./LichCard";
import type { LichDanhGiaData } from "./useLichDanhGiaData";

// Khối "Lịch tuần" -- điều hướng tuần, bộ lọc khoa/cán bộ phụ trách, lưới 6
// ngày (T2-T7) hiện tối đa DAY_VISIBLE_LIMIT buổi/ngày, dư thì mở modal "xem
// thêm" (xem DayDetailModal).
export default function WeekGrid({ lg }: { lg: LichDanhGiaData }) {
  const {
    weekStart,
    setWeekStart,
    weekDays,
    weekEnd,
    canBrowseKhoaCanBo,
    khoaList,
    filterKhoaCanBo,
    setFilterKhoaCanBo,
    filterNguoi,
    setFilterNguoi,
    canBoOptions,
    lichForDay,
    today,
    setDayModalDate,
    isDone,
    canManageThisView,
    openEditModal,
    setConfirmDeleteGroup,
    setDeleteError,
  } = lg;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          className={btnSecondary}
          onClick={() =>
            setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))
          }
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Tuần {fmtVN(weekDays[0])} – {fmtVN(weekEnd)}/{weekEnd.getFullYear()}
        </p>
        <button
          className={btnSecondary}
          onClick={() =>
            setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))
          }
        >
          <ChevronRight size={16} />
        </button>
        <button
          className={btnSecondary}
          onClick={() => setWeekStart(startOfWeek(new Date()))}
        >
          Hôm nay
        </button>
        {canBrowseKhoaCanBo && (
          <div className="ml-auto" style={{ minWidth: 220 }}>
            <SearchableSelect
              value={filterKhoaCanBo}
              onChange={setFilterKhoaCanBo}
              options={khoaList.map((k) => ({
                value: k.id,
                label: k.ten_khoa,
              }))}
              placeholder="— Khoa/Phòng cán bộ: Tất cả —"
            />
          </div>
        )}
        <select
          className={`${inputCls} ${canBrowseKhoaCanBo ? "" : "ml-auto"}`}
          value={filterNguoi}
          onChange={(e) => setFilterNguoi(e.target.value)}
        >
          <option value="">— Tất cả cán bộ —</option>
          {canBoOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email || u.username}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {weekDays.map((d, i) => {
          const dayLich = lichForDay(d);
          const isToday = fmt(d) === fmt(today);
          return (
            <div
              key={i}
              className={`min-h-[130px] rounded-xl border p-3 ${
                isToday
                  ? "border-brand-300 bg-brand-25 ring-1 ring-brand-200 dark:border-brand-500/40 dark:bg-brand-500/5 dark:ring-brand-500/20"
                  : "border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/40"
              }`}
            >
              <p
                className={`mb-2 text-xs font-semibold ${isToday ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}
              >
                {THU_LABEL[i + 1]} · {fmtVN(d)} {isToday && "• Hôm nay"}
              </p>
              <div className="space-y-1.5">
                {dayLich.length === 0 && (
                  <p className="text-[11px] text-gray-300 dark:text-gray-600">
                    —
                  </p>
                )}
                {(() => {
                  const dayGroups = groupLich(dayLich);
                  const visible = dayGroups.slice(0, DAY_VISIBLE_LIMIT);
                  const extra = dayGroups.length - visible.length;
                  return (
                    <>
                      {visible.map((g) => (
                        <LichCard
                          key={g.key}
                          g={g}
                          d={d}
                          today={today}
                          isDone={isDone}
                          canManageThisView={canManageThisView}
                          onEdit={() => openEditModal(g)}
                          onDelete={() => {
                            setDeleteError(null);
                            setConfirmDeleteGroup(g);
                          }}
                        />
                      ))}
                      {extra > 0 && (
                        <button
                          type="button"
                          onClick={() => setDayModalDate(d)}
                          className="w-full rounded-lg border border-dashed border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-brand-600 transition hover:bg-brand-50 dark:border-gray-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
                        >
                          Xem thêm (+{extra})
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
