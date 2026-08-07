import { Search } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  Field,
  inputCls,
  Modal,
} from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { THU_LABEL } from "./constants";
import { fmtVNFromDateStr } from "./dateUtils";
import type { LichDanhGiaData } from "./useLichDanhGiaData";

// Modal thêm mới / sửa 1 buổi lịch đánh giá.
export default function LichFormModal({ lg }: { lg: LichDanhGiaData }) {
  const {
    modalOpen,
    setModalOpen,
    mEditGroup,
    saveLich,
    savingLich,
    mDotDanhGiaId,
    setMDotDanhGiaId,
    modalDotOptions,
    dotDanhGiaList,
    mType,
    mNgay,
    setMNgay,
    selectedDot,
    mThu,
    isAdmin,
    mKhoa,
    setMKhoa,
    khoaList,
    mVitri,
    setMVitri,
    mConfigTypes,
    mNguoi,
    setMNguoi,
    mNguoiSearch,
    setMNguoiSearch,
    nguoiOptions,
    mGhiChu,
    setMGhiChu,
    modalError,
  } = lg;

  return (
    <Modal
      open={modalOpen}
      title={mEditGroup ? "Sửa lịch đánh giá" : "Thêm lịch đánh giá"}
      onClose={() => setModalOpen(false)}
      footer={
        <>
          <button className={btnSecondary} onClick={() => setModalOpen(false)}>
            Huỷ
          </button>
          <button
            className={btnPrimary}
            onClick={saveLich}
            disabled={savingLich}
          >
            {savingLich
              ? "Đang lưu..."
              : mEditGroup
                ? "Lưu thay đổi"
                : "Lưu lịch"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Loại lịch (Đợt đánh giá)">
          <select
            className={inputCls}
            value={mDotDanhGiaId}
            onChange={(e) =>
              setMDotDanhGiaId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">— Chọn đợt đánh giá —</option>
            {modalDotOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten_dot}
              </option>
            ))}
          </select>
          {dotDanhGiaList.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-500">
              Chưa có đợt đánh giá nào đang mở — vào Cấu hình {">"} Đợt đánh
              giá để tạo trước.
            </p>
          )}
        </Field>
        <Field
          label={
            mType === "dinh_ky" ? "Ngày bắt đầu định kỳ" : "Ngày đánh giá"
          }
        >
          <input
            type="date"
            className={inputCls}
            value={mNgay}
            min={selectedDot?.tu_ngay || undefined}
            max={selectedDot?.den_ngay || undefined}
            onChange={(e) => setMNgay(e.target.value)}
          />
          {selectedDot?.tu_ngay && selectedDot?.den_ngay && (
            <p className="mt-1 text-[11px] text-gray-400">
              Trong khoảng {fmtVNFromDateStr(selectedDot.tu_ngay)} –{" "}
              {fmtVNFromDateStr(selectedDot.den_ngay)} (theo đợt đã chọn)
            </p>
          )}
        </Field>
        {mType === "dinh_ky" && (
          <Field label="Thứ trong tuần (tự động theo ngày đã chọn)">
            <div
              className={`${inputCls} bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
            >
              {THU_LABEL[mThu]} — lặp lại hàng tuần kể từ ngày trên
            </div>
          </Field>
        )}
        <Field
          label={
            isAdmin
              ? "Khoa / Phòng / TT"
              : "Khoa / Phòng / TT (khoa của bạn — không đổi được)"
          }
        >
          <SearchableSelect
            value={mKhoa}
            onChange={setMKhoa}
            options={khoaList.map((k) => ({
              value: k.id,
              label: k.ten_khoa,
            }))}
            placeholder="— Chọn khoa —"
            disabled={!isAdmin}
          />
        </Field>
        <Field label="Vị trí đánh giá (theo cấu hình khoa)">
          <select
            className={inputCls}
            value={mVitri}
            onChange={(e) =>
              setMVitri(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">— Tất cả vị trí —</option>
            {mConfigTypes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten_vitri}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={`Người phụ trách (${mNguoi.length} đã chọn — Tích chọn 1 hoặc nhiều người)`}
        >
          <div className="relative mb-1.5">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className={`${inputCls} w-full pl-9`}
              value={mNguoiSearch}
              onChange={(e) => setMNguoiSearch(e.target.value)}
              placeholder="Gõ tên để lọc nhanh cán bộ..."
            />
          </div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
            {nguoiOptions.map((u) => {
              const on = mNguoi.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    setMNguoi((p) =>
                      on ? p.filter((x) => x !== u.id) : [...p, u.id],
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {u.email || u.username}
                </button>
              );
            })}
            {nguoiOptions.length === 0 && (
              <p className="text-xs text-gray-400">
                {mKhoa === ""
                  ? "Hãy chọn Khoa/Phòng/TT trước để hiển thị danh sách cán bộ"
                  : mNguoiSearch.trim()
                    ? "Không tìm thấy cán bộ phù hợp"
                    : "Không có cán bộ nào trong phạm vi quyền của bạn"}
              </p>
            )}
          </div>
        </Field>
        <Field label="Ghi chú">
          <input
            className={inputCls}
            value={mGhiChu}
            onChange={(e) => setMGhiChu(e.target.value)}
            placeholder="VD: Kiểm tra theo chỉ đạo GĐ..."
          />
        </Field>
        {modalError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            ✗ {modalError}
          </p>
        )}
      </div>
    </Modal>
  );
}
