import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { btnSecondary, Field, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { CHAT_LUONG_OPTIONS } from "./constants";
import { addDays, fmtVN, startOfWeek } from "./helpers";
import type { Zalo5SData } from "./useZalo5SData";

export default function FilterBar({ z }: { z: Zalo5SData }) {
  const {
    weekStart,
    setWeekStart,
    weekEnd,
    filterKhoa,
    setFilterKhoa,
    khoaList,
    filterTrangThai,
    setFilterTrangThai,
    filterChatLuong,
    setFilterChatLuong,
  } = z;

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Field label="Tuần đang xem">
        <div className="flex items-center gap-1.5">
          <button
            className={btnSecondary}
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="flex h-9 min-w-[150px] items-center justify-center whitespace-nowrap rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
            {fmtVN(weekStart)} – {fmtVN(weekEnd)}/{weekEnd.getFullYear()}
          </span>
          <button
            className={btnSecondary}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
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

      <Field label="Khoa / Phòng" className="min-w-[220px]">
        <SearchableSelect
          value={filterKhoa}
          onChange={setFilterKhoa}
          options={khoaList.map((k) => ({ value: k.id, label: k.ten_khoa }))}
          placeholder="— Tất cả khoa/phòng —"
        />
      </Field>

      <Field label="Trạng thái">
        <select
          className={inputCls}
          value={filterTrangThai}
          onChange={(e) =>
            setFilterTrangThai(e.target.value as "" | "da-gui" | "chua-gui")
          }
        >
          <option value="">— Tất cả —</option>
          <option value="da-gui">✓ Đã gửi</option>
          <option value="chua-gui">Chưa gửi</option>
        </select>
      </Field>

      <Field label="Chất lượng">
        <select
          className={inputCls}
          value={filterChatLuong}
          onChange={(e) => setFilterChatLuong(e.target.value)}
        >
          <option value="">— Tất cả —</option>
          {CHAT_LUONG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}
            </option>
          ))}
        </select>
      </Field>

      {(filterKhoa !== "" || filterTrangThai || filterChatLuong) && (
        <button
          className={btnSecondary}
          onClick={() => {
            setFilterKhoa("");
            setFilterTrangThai("");
            setFilterChatLuong("");
          }}
        >
          <RotateCcw size={14} /> Xoá lọc
        </button>
      )}
    </div>
  );
}
