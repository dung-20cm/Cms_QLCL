import { RotateCcw } from "lucide-react";
import { btnSecondary, Field, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import type { SortKey } from "./types";
import type { TongHopData } from "./useTongHopData";

export default function FilterBar({ t }: { t: TongHopData }) {
  const {
    fFrom,
    setFFrom,
    fTo,
    setFTo,
    effectiveFKhoa,
    setFKhoa,
    khoaList,
    canBrowseKhoa,
    fVitri,
    setFVitri,
    vitriTypes,
    fDot,
    setFDot,
    dotOptions,
    sort,
    setSort,
    resetFilters,
    filtered,
  } = t;

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Field label="Từ ngày">
        <input
          type="date"
          className={inputCls}
          value={fFrom}
          onChange={(e) => setFFrom(e.target.value)}
        />
      </Field>
      <Field label="Đến ngày">
        <input
          type="date"
          className={inputCls}
          value={fTo}
          onChange={(e) => setFTo(e.target.value)}
        />
      </Field>
      <Field label="Khoa / Phòng">
        <SearchableSelect
          value={effectiveFKhoa}
          onChange={(v) => setFKhoa(v)}
          options={khoaList.map((k) => ({
            value: String(k.id),
            label: k.ten_khoa,
          }))}
          placeholder="— Tất cả —"
          disabled={!canBrowseKhoa}
        />
      </Field>
      <Field label="Vị trí">
        <select
          className={inputCls}
          value={fVitri}
          onChange={(e) => setFVitri(e.target.value)}
        >
          <option value="">— Tất cả —</option>
          {vitriTypes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.ten_vitri}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Đợt đánh giá">
        <select
          className={inputCls}
          value={fDot}
          onChange={(e) => setFDot(e.target.value)}
        >
          <option value="">— Tất cả —</option>
          {dotOptions.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="Sắp xếp">
        <select
          className={inputCls}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="newest">🕐 Mới nhất lên trên</option>
          <option value="oldest">🕐 Cũ nhất lên trên</option>
          <option value="rank_desc">🏆 Điểm cao → thấp</option>
          <option value="rank_asc">↓ Điểm thấp → cao</option>
          <option value="khoa">🏥 Theo tên đơn vị</option>
        </select>
      </Field>
      <button className={btnSecondary} onClick={resetFilters}>
        <RotateCcw size={14} /> Xoá lọc
      </button>
      <span className="pb-2 text-xs text-gray-400">
        {filtered.length} lượt
      </span>
    </div>
  );
}
