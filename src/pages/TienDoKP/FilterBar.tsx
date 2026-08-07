import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { btnSecondary, Field, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { TRANG_THAI } from "./constants";
import { addDays, fmtVN, startOfWeek } from "./helpers";
import type { TienDoKPData } from "./useTienDoKPData";

// Điều hướng tuần + bộ lọc khoa/trạng thái.
export default function FilterBar({ t }: { t: TienDoKPData }) {
  const {
    weekStart,
    setWeekStart,
    weekEnd,
    isFullScope,
    khoaList,
    fKhoa,
    setFKhoa,
    fTT,
    setFTT,
  } = t;

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Field label="Tuần đang xem">
        <div className="flex items-center gap-2">
          <button
            className={btnSecondary}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-200">
            {fmtVN(weekStart)} – {fmtVN(weekEnd)}/{weekEnd.getFullYear()}
          </p>
          <button
            className={btnSecondary}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            title="Tuần sau"
          >
            <ChevronRight size={16} />
          </button>
          <button
            className={btnSecondary}
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Tuần này
          </button>
        </div>
      </Field>
      {/* Trưởng khoa/Nhân viên chỉ xem được đúng khoa mình (đã lọc sẵn ở
          backend) -- ẩn hẳn ô chọn khoa để tránh gây hiểu lầm có thể xem
          khoa khác. Chỉ Admin/Phòng QLCL (isFullScope) mới cần chọn khoa. */}
      {isFullScope && (
        <Field label="Khoa / Phòng" className="min-w-[220px]">
          <SearchableSelect
            value={fKhoa}
            onChange={(v) => setFKhoa(v)}
            options={khoaList.map((k) => ({
              value: String(k.id),
              label: k.ten_khoa,
            }))}
            placeholder="— Tất cả khoa —"
          />
        </Field>
      )}
      <Field label="Trạng thái">
        <select
          className={inputCls}
          value={fTT}
          onChange={(e) => setFTT(e.target.value)}
        >
          <option value="">— Tất cả —</option>
          {TRANG_THAI.map((t) => (
            <option key={t}>{t}</option>
          ))}
          <option>Quá hạn</option>
        </select>
      </Field>
      <button
        className={btnSecondary}
        onClick={() => {
          setFTT("");
          setFKhoa("");
        }}
      >
        <RotateCcw size={14} /> Xoá lọc
      </button>
      <span className="pb-2 text-xs text-gray-400">
        Hành động KP được tạo tự động cho mọi tiêu chí ✗ khi lưu Bảng kiểm —
        hoặc bấm "Thêm hành động KP" để tạo tay
      </span>
    </div>
  );
}
