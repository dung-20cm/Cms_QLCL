import { Field, inputCls } from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import type { BaoCaoData } from "./useBaoCaoData";

// Bộ lọc "chọn dữ liệu" — nội dung đổi hẳn theo rptType đang chọn (5 nhánh dữ
// liệu khác nhau). Nhận nguyên object state từ useBaoCaoData() thay vì tách
// hàng chục props riêng lẻ -- tách nhỏ hơn nữa sẽ khó theo dõi hơn, không dễ hơn.
export default function ReportFilters({ bc }: { bc: BaoCaoData }) {
  const {
    rptType,
    khoaList,
    canViewAllKhoa,
    scopedRows,
    rows,
    selLuot,
    setSelLuot,
    nhanXet,
    setNhanXet,
    selThang,
    setSelThang,
    thangOptions,
    effectiveSelKhoa,
    setSelKhoa,
    effectiveDvKhoa,
    setDvKhoa,
    dvFrom,
    setDvFrom,
    dvTo,
    setDvTo,
    selDotId,
    setSelDotId,
    dotDanhGiaAllList,
    effectiveSelDotKhoa,
    setSelDotKhoa,
    dotNhanXet,
    setDotNhanXet,
    gkMode,
    setGkMode,
    gkNgay,
    setGkNgay,
    gkKhoa,
    setGkKhoa,
    gkKhoaOptionsForNgay,
    gkNgayOptions,
    gkLuot,
    setGkLuot,
    gkHanDays,
    setGkHanDays,
    today,
  } = bc;

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {rptType === "luot" && (
        <>
          <Field label="Chọn lượt đánh giá" className="min-w-[300px]">
            <select
              className={inputCls}
              value={selLuot}
              onChange={(e) => setSelLuot(e.target.value)}
            >
              <option value="">— Chọn lượt —</option>
              {scopedRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")} ·{" "}
                  {r.khoa?.ten_khoa} · {r.vitri_type?.ten_vitri} · {r.pct}%
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Nhận xét thêm (tuỳ chọn)"
            className="min-w-[260px] flex-1"
          >
            <input
              className={inputCls}
              value={nhanXet}
              onChange={(e) => setNhanXet(e.target.value)}
              placeholder="Nhận xét của người kiểm tra..."
            />
          </Field>
        </>
      )}
      {rptType === "thang" && (
        <>
          <Field label="Tháng">
            <select
              className={inputCls}
              value={selThang}
              onChange={(e) => setSelThang(e.target.value)}
            >
              <option value="">— Chọn tháng —</option>
              {thangOptions.map((t) => (
                <option key={t} value={t}>
                  Tháng {t.slice(5)}/{t.slice(0, 4)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lọc theo khoa (tuỳ chọn)">
            <SearchableSelect
              value={effectiveSelKhoa}
              onChange={(v) => setSelKhoa(v)}
              options={khoaList.map((k) => ({
                value: String(k.id),
                label: k.ten_khoa,
              }))}
              placeholder="— Tất cả khoa —"
              disabled={!canViewAllKhoa}
            />
          </Field>
        </>
      )}
      {rptType === "donvi" && (
        <>
          <Field label="Đơn vị (bắt buộc)" className="min-w-[260px]">
            <SearchableSelect
              value={effectiveDvKhoa}
              onChange={(v) => setDvKhoa(v)}
              options={khoaList.map((k) => ({
                value: String(k.id),
                label: k.ten_khoa,
              }))}
              placeholder="— Chọn khoa —"
              disabled={!canViewAllKhoa}
            />
          </Field>
          <Field label="Từ ngày">
            <input
              type="date"
              className={inputCls}
              value={dvFrom}
              onChange={(e) => setDvFrom(e.target.value)}
            />
          </Field>
          <Field label="Đến ngày">
            <input
              type="date"
              className={inputCls}
              value={dvTo}
              onChange={(e) => setDvTo(e.target.value)}
            />
          </Field>
        </>
      )}
      {rptType === "dot" && (
        <>
          <Field label="Đợt đánh giá (bắt buộc)" className="min-w-[240px]">
            <select
              className={inputCls}
              value={selDotId}
              onChange={(e) => setSelDotId(e.target.value)}
            >
              <option value="">— Chọn đợt đánh giá —</option>
              {dotDanhGiaAllList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ten_dot}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Khoa / Phòng (bắt buộc)" className="min-w-[240px]">
            <SearchableSelect
              value={effectiveSelDotKhoa}
              onChange={(v) => setSelDotKhoa(v)}
              options={khoaList.map((k) => ({
                value: String(k.id),
                label: k.ten_khoa,
              }))}
              placeholder="— Chọn khoa —"
              disabled={!canViewAllKhoa}
            />
          </Field>
          <Field
            label="Nhận xét thêm (tuỳ chọn)"
            className="min-w-[260px] flex-1"
          >
            <input
              className={inputCls}
              value={dotNhanXet}
              onChange={(e) => setDotNhanXet(e.target.value)}
              placeholder="Nhận xét của người kiểm tra..."
            />
          </Field>
        </>
      )}
      {rptType === "guikhoa" && (
        <>
          <Field label="Chế độ">
            <select
              className={inputCls}
              value={gkMode}
              onChange={(e) => setGkMode(e.target.value as "ngay" | "luot")}
            >
              <option value="ngay">
                📅 Theo ngày (tổng hợp tất cả vị trí)
              </option>
              <option value="luot">📋 Theo từng lượt đánh giá</option>
            </select>
          </Field>
          {gkMode === "ngay" ? (
            <>
              <Field label="Chọn ngày đánh giá">
                <select
                  className={inputCls}
                  value={gkNgay}
                  onChange={(e) => setGkNgay(e.target.value)}
                >
                  <option value="">— Chọn ngày —</option>
                  {gkNgayOptions.map(([ngay, n]) => {
                    const isToday = ngay === today;
                    return (
                      <option key={ngay} value={ngay}>
                        {new Date(ngay).toLocaleDateString("vi-VN")}
                        {isToday ? " ★ Hôm nay" : ""} ({n} vị trí)
                      </option>
                    );
                  })}
                </select>
              </Field>
              {gkNgay && (
                <Field label="Chọn khoa / phòng / TT">
                  <select
                    className={inputCls}
                    value={gkKhoa}
                    onChange={(e) => setGkKhoa(e.target.value)}
                  >
                    <option value="">— Chọn khoa —</option>
                    {gkKhoaOptionsForNgay.map((k) => (
                      <option key={k.khoa_id} value={k.khoa_id}>
                        {k.name} ({k.n} vị trí)
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          ) : (
            <Field label="Chọn lượt đánh giá" className="min-w-[300px]">
              <select
                className={inputCls}
                value={gkLuot}
                onChange={(e) => setGkLuot(e.target.value)}
              >
                <option value="">— Chọn lượt —</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}{" "}
                    · {r.khoa?.ten_khoa} · {r.vitri_type?.ten_vitri} ·{" "}
                    {r.pct}%
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Hạn nộp KP (mặc định 5 ngày)">
            <input
              type="number"
              className={inputCls}
              style={{ maxWidth: 90 }}
              value={gkHanDays}
              min={1}
              max={30}
              onChange={(e) => setGkHanDays(Number(e.target.value) || 5)}
            />
          </Field>
          <span className="pb-2 text-xs text-gray-400">ngày làm việc</span>
        </>
      )}
    </div>
  );
}
