import { RotateCcw, Search } from "lucide-react";
import { btnSecondary, Field, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import type { TaiKhoanData } from "./useTaiKhoanData";

export default function FilterBar({ t }: { t: TaiKhoanData }) {
  const {
    fName,
    setFName,
    fRole,
    setFRole,
    roles,
    isScopedManager,
    fKhoa,
    setFKhoa,
    khoaList,
    filtered,
  } = t;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <Field label="Tìm kiếm" className="min-w-52 flex-1">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className={`${inputCls} w-full pl-9`}
            placeholder="Tên đăng nhập hoặc họ tên..."
            value={fName}
            onChange={(e) => setFName(e.target.value)}
          />
        </div>
      </Field>
      <Field label="Quyền">
        <select
          className={inputCls}
          value={fRole}
          onChange={(e) => setFRole(e.target.value)}
        >
          <option value="">— Tất cả —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      {!isScopedManager && (
        <Field label="Khoa / Phòng" className="min-w-48">
          <SearchableSelect
            value={fKhoa}
            onChange={(v) => setFKhoa(v)}
            options={khoaList.map((k) => ({
              value: k.id,
              label: k.ten_khoa,
            }))}
            placeholder="— Tất cả —"
          />
        </Field>
      )}
      <button
        className={btnSecondary}
        onClick={() => {
          setFName("");
          setFRole("");
          setFKhoa("");
        }}
      >
        <RotateCcw size={15} /> Xoá lọc
      </button>
      <span className="pb-2 text-xs text-gray-400">
        {filtered.length} tài khoản
      </span>
    </div>
  );
}
