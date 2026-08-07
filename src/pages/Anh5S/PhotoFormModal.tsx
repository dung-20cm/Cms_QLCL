import { Check, Upload, X } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  Field,
  inputCls,
  Modal,
} from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { KET_QUA_ANH_OPTIONS } from "../../features/qlcl/types";
import type { Anh5SData } from "./useAnh5SData";

// Modal thêm ảnh mới / sửa 1 lượt gửi ảnh.
export default function PhotoFormModal({ a }: { a: Anh5SData }) {
  const {
    form,
    setForm,
    formError,
    saving,
    saveProgress,
    handleSubmit,
    khoaList,
    vitriTypes,
    users,
    removeExistingPhoto,
    addFiles,
    removeNewFile,
  } = a;

  return (
    <Modal
      open={!!form}
      title={form?.editIds ? "Sửa lượt gửi ảnh" : "Thêm ảnh 5S"}
      onClose={() => !saving && setForm(null)}
      wide
      footer={
        <>
          <button
            className={btnSecondary}
            disabled={saving}
            onClick={() => setForm(null)}
          >
            Huỷ
          </button>
          <button className={btnPrimary} disabled={saving} onClick={handleSubmit}>
            <Check size={14} /> {saving ? saveProgress || "Đang lưu..." : "Lưu"}
          </button>
        </>
      }
    >
      {form && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {formError && (
            <div className="sm:col-span-2">
              <ErrorBanner message={formError} />
            </div>
          )}
          {form.locked ? (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400 sm:col-span-2">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                {form.lockedInfo?.khoa}
              </p>
              <p className="mt-0.5">
                📍 {form.lockedInfo?.vitri} · 👤 {form.lockedInfo?.nguoi} ·{" "}
                {form.lockedInfo?.ngay}
              </p>
              <p className="mt-0.5">
                Kết quả:{" "}
                <span className="font-semibold">{form.lockedInfo?.ketQua}</span>
              </p>
              <p className="mt-1 text-gray-400">
                Ảnh gắn với lượt đánh giá thật (từ Bảng kiểm) — không đổi được
                Khoa/Vị trí/Ngày/Kết quả, chỉ sửa được ghi chú và ảnh minh
                chứng.
              </p>
            </div>
          ) : (
            <>
              <Field label="Khoa / Phòng *">
                <SearchableSelect
                  value={form.khoa_id}
                  onChange={(v) => setForm({ ...form, khoa_id: v })}
                  options={khoaList.map((k) => ({
                    value: k.id,
                    label: k.ten_khoa,
                  }))}
                  placeholder="— Chọn khoa —"
                />
              </Field>
              <Field label="Vị trí đánh giá">
                <SearchableSelect
                  value={form.vitri_type_id}
                  onChange={(v) => setForm({ ...form, vitri_type_id: v })}
                  options={vitriTypes.map((v) => ({
                    value: v.id,
                    label: v.ten_vitri,
                  }))}
                  placeholder="— Không chọn —"
                />
              </Field>
              <Field label="Ngày chụp">
                <input
                  type="date"
                  className={inputCls}
                  value={form.ngay_chup}
                  onChange={(e) =>
                    setForm({ ...form, ngay_chup: e.target.value })
                  }
                />
              </Field>
              <Field label="Người gửi">
                <SearchableSelect
                  value={form.nguoi_gui_id}
                  onChange={(v) => setForm({ ...form, nguoi_gui_id: v })}
                  options={users.map((u) => ({
                    value: u.id,
                    label: u.email || u.username,
                  }))}
                  placeholder="— Không chọn —"
                />
              </Field>
              <Field label="Kết quả đánh giá *" className="sm:col-span-2">
                <div className="flex gap-2">
                  {KET_QUA_ANH_OPTIONS.map((kq) => (
                    <button
                      key={kq}
                      type="button"
                      onClick={() => setForm({ ...form, ket_qua: kq })}
                      className={`h-9 flex-1 rounded-lg border text-sm font-medium transition ${
                        form.ket_qua === kq
                          ? kq === "Chưa đạt"
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-emerald-500 bg-emerald-500 text-white"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {kq === "Chưa đạt" ? "❌" : "✅"} {kq}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}
          <Field label="Ghi chú" className="sm:col-span-2">
            <input
              className={inputCls}
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              placeholder="Ghi chú thêm (không bắt buộc)..."
            />
          </Field>

          <Field
            label={`Ảnh (${form.existingPhotos.length + form.newFiles.length})`}
            className="sm:col-span-2"
          >
            <div className="flex flex-wrap gap-2">
              {form.existingPhotos.map((p) => (
                <div
                  key={p.id}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <img src={p.url_anh} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeExistingPhoto(p.id)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {form.newFiles.map((f, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-brand-200 dark:border-brand-500/30"
                >
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => removeNewFile(i)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-gray-700">
                <Upload size={16} />
                <span className="text-[10px]">Chọn ảnh</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            </div>
          </Field>
        </div>
      )}
    </Modal>
  );
}
