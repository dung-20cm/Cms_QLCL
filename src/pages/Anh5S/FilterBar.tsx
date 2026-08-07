import { btnSecondary, Field, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import type { Anh5SData } from "./useAnh5SData";

export default function FilterBar({ a }: { a: Anh5SData }) {
  const {
    fLoai,
    setFLoai,
    fFrom,
    setFFrom,
    fTo,
    setFTo,
    fKhoa,
    setFKhoa,
    fNguoi,
    setFNguoi,
    khoaList,
    nguoiFilterOptions,
    resetFilters,
  } = a;

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex gap-1.5">
        {[
          { v: "", label: "Tất cả" },
          { v: "dat", label: "✅ Đạt" },
          { v: "khdat", label: "❌ Chưa đạt" },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => setFLoai(o.v)}
            className={`h-9 rounded-full border px-4 text-xs font-medium transition ${
              fLoai === o.v
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
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
          value={fKhoa}
          onChange={(v) => setFKhoa(v)}
          options={khoaList.map((k) => ({
            value: String(k.id),
            label: k.ten_khoa,
          }))}
          placeholder="— Tất cả —"
        />
      </Field>
      <Field label="Nhân viên">
        <SearchableSelect
          value={fNguoi}
          onChange={(v) => setFNguoi(v)}
          options={nguoiFilterOptions}
          placeholder="— Tất cả —"
        />
      </Field>
      <button className={btnSecondary} onClick={resetFilters}>
        ↺ Đặt lại
      </button>
    </div>
  );
}
