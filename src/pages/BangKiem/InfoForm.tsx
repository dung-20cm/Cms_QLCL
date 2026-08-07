import { Field, inputCls } from "../../components/ui/PageShell";
import MultiSelect from "../../components/ui/MultiSelect";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { todayStr } from "./helpers";
import type { BangKiemData } from "./useBangKiemData";

// Khối "Thông tin đánh giá" -- chọn khoa/vị trí/vị trí chi tiết/người đánh
// giá/đợt/ngày trước khi chấm bảng kiểm.
export default function InfoForm({ bk }: { bk: BangKiemData }) {
  const {
    khoaId,
    setKhoaId,
    khoaList,
    isScopedToOwnKhoa,
    vitriTypeId,
    setVitriTypeId,
    configTypes,
    hasConfig,
    maByType,
    viTriChiTietIds,
    setViTriChiTietIds,
    viTriChiTiet,
    setViTriChiTiet,
    user,
    dongDanhGiaIds,
    setDongDanhGiaIds,
    dongDanhGiaOptions,
    dot,
    setDot,
    dotOptions,
    dotList,
    ngay,
    setNgay,
  } = bk;

  return (
    <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Khoa / Phòng / Trung tâm">
          <SearchableSelect
            value={khoaId}
            onChange={setKhoaId}
            options={khoaList.map((k) => ({
              value: k.id,
              label: k.ten_khoa,
            }))}
            placeholder="— Chọn khoa —"
            disabled={isScopedToOwnKhoa}
          />
          {isScopedToOwnKhoa && (
            <p className="mt-1 text-[11px] text-gray-400">
              Bạn chỉ chấm được bảng kiểm của khoa/phòng mình.
            </p>
          )}
        </Field>
        <Field
          label={`Vị trí đánh giá ${khoaId !== "" && hasConfig ? "" : ""}`}
        >
          <select
            className={inputCls}
            value={vitriTypeId}
            onChange={(e) =>
              setVitriTypeId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">— Chọn vị trí —</option>
            {configTypes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten_vitri}
              </option>
            ))}
          </select>
        </Field>
        {vitriTypeId !== "" &&
        (maByType.get(Number(vitriTypeId))?.length ?? 0) > 0 ? (
          <Field label="Vị trí chi tiết">
            <MultiSelect
              values={viTriChiTietIds}
              onChange={setViTriChiTietIds}
              options={maByType.get(Number(vitriTypeId))!.map((r) => ({
                value: r.id,
                label: r.ma_vitri,
              }))}
              placeholder="— Chọn vị trí chi tiết —"
              selectedText={(n) => `${n} vị trí đã chọn`}
            />
          </Field>
        ) : (
          <Field label="Vị trí chi tiết (buồng số, phòng số...)">
            <input
              className={inputCls}
              value={viTriChiTiet}
              onChange={(e) => setViTriChiTiet(e.target.value)}
              placeholder="VD: Buồng 3, Phòng mổ 1, Xe số 2..."
            />
          </Field>
        )}
        <Field label="Người đánh giá">
          <MultiSelect
            values={user ? [user.id, ...dongDanhGiaIds] : dongDanhGiaIds}
            onChange={(vals) =>
              setDongDanhGiaIds(vals.filter((id) => id !== user?.id))
            }
            lockedValues={user ? [user.id] : []}
            options={[
              ...(user
                ? [{ value: user.id, label: user.email || user.username }]
                : []),
              ...dongDanhGiaOptions.map((u) => ({
                value: u.id,
                label: u.email || u.username,
              })),
            ]}
            placeholder="— Chọn người đánh giá —"
          />
        </Field>
        <Field label={`Đợt đánh giá${dotList.length > 0 ? "" : ""}`}>
          <select
            className={inputCls}
            value={dot}
            onChange={(e) => setDot(e.target.value)}
          >
            {dotOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày đánh giá">
          <input
            type="date"
            className={inputCls}
            max={todayStr()}
            value={ngay}
            onChange={(e) => {
              const v = e.target.value;
              setNgay(v > todayStr() ? todayStr() : v);
            }}
          />
        </Field>
      </div>
    </div>
  );
}
