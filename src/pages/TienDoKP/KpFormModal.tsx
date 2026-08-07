import { Sparkles } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  Field,
  inputCls,
  Modal,
} from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { S_IDS, S_META, TRANG_THAI } from "./constants";
import type { TienDoKPData } from "./useTienDoKPData";

export default function KpFormModal({ t }: { t: TienDoKPData }) {
  const {
    modalOpen,
    editingId,
    editingKp,
    closeModal,
    save,
    saving,
    locked,
    form,
    setForm,
    khoaList,
    isFullScope,
    vitriTypes,
    effectiveLoiText,
    aiLoading,
    getAISuggest,
    aiSuggestion,
    aiHan,
    applyAISuggest,
    users,
    modalError,
  } = t;

  return (
    <Modal
      open={modalOpen}
      title={
        editingId ? "Cập nhật hành động khắc phục" : "Thêm hành động khắc phục"
      }
      onClose={closeModal}
      wide
      footer={
        <>
          <button className={btnSecondary} onClick={closeModal}>
            Huỷ
          </button>
          <button className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        {locked ? (
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <p>
              <span className="font-semibold">
                {editingKp?.khoa?.ten_khoa}
              </span>
              {" · "}
              {editingKp?.vitri_type?.ten_vitri}
              {editingKp?.danh_gia_chi_tiet?.checklist_item?.s_id && (
                <>
                  {" · "}
                  <span className="font-semibold">
                    {editingKp.danh_gia_chi_tiet.checklist_item.s_id}
                  </span>
                </>
              )}
            </p>
            <p className="mt-1">
              {editingKp?.danh_gia_chi_tiet?.checklist_item?.tc}
            </p>
            <p className="mt-1 text-gray-400">
              Phát sinh tự động từ Bảng kiểm — không đổi được Khoa/Vị trí/Mã
              S/Ngày phát hiện.
              {editingKp?.ngay_phat_hien &&
                ` Ngày phát hiện: ${new Date(editingKp.ngay_phat_hien).toLocaleDateString("vi-VN")}.`}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Khoa / Phòng / TT">
                <SearchableSelect
                  value={form.khoa}
                  onChange={(v) => setForm((f) => ({ ...f, khoa: v }))}
                  options={khoaList.map((k) => ({
                    value: String(k.id),
                    label: k.ten_khoa,
                  }))}
                  placeholder="— Chọn khoa —"
                  disabled={!isFullScope}
                />
              </Field>
              <Field label="Vị trí đánh giá">
                <SearchableSelect
                  value={form.vitri}
                  onChange={(v) => setForm((f) => ({ ...f, vitri: v }))}
                  options={vitriTypes.map((v) => ({
                    value: String(v.id),
                    label: v.ten_vitri,
                  }))}
                  placeholder="— Chọn vị trí —"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mã S (tiêu chí lỗi)">
                <select
                  className={inputCls}
                  value={form.sId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sId: e.target.value }))
                  }
                >
                  {S_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id} – {S_META[id].name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="📅 Ngày phát hiện lỗi">
                <input
                  type="date"
                  className={inputCls}
                  value={form.ngayPhatHien}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ngayPhatHien: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label="Mô tả lỗi / tiêu chí chưa đạt">
              <textarea
                className={`${inputCls} h-20 resize-y py-2`}
                value={form.moTaLoi}
                onChange={(e) =>
                  setForm((f) => ({ ...f, moTaLoi: e.target.value }))
                }
                placeholder="Mô tả cụ thể lỗi/tiêu chí 5S chưa đạt..."
              />
            </Field>
          </>
        )}

        <Field label="Hành động khắc phục (AI gợi ý bên dưới)">
          <textarea
            className={`${inputCls} h-24 resize-y py-2`}
            value={form.hanhDong}
            onChange={(e) =>
              setForm((f) => ({ ...f, hanhDong: e.target.value }))
            }
            placeholder="Điền hoặc bấm 'Tư vấn AI' bên dưới để lấy gợi ý..."
          />
        </Field>
        <div>
          <button
            type="button"
            className={btnSecondary}
            onClick={getAISuggest}
            disabled={aiLoading || !effectiveLoiText.trim()}
          >
            <Sparkles size={14} />{" "}
            {aiLoading ? "Đang tư vấn AI..." : "💡 Tư vấn AI"}
          </button>
        </div>
        {aiSuggestion && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm dark:border-teal-500/30 dark:bg-teal-500/10">
            <p className="font-semibold text-teal-700 dark:text-teal-400">
              💡 Gợi ý từ AI
            </p>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              {aiSuggestion}
            </p>
            {aiHan && (
              <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">
                ⏰ Hạn đề xuất: {aiHan.toLocaleDateString("vi-VN")} (7 ngày làm
                việc)
              </p>
            )}
            <button
              type="button"
              className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700"
              onClick={applyAISuggest}
            >
              Áp dụng gợi ý này
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Người chịu trách nhiệm">
            <select
              className={inputCls}
              value={form.nguoi}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  nguoi: e.target.value ? Number(e.target.value) : "",
                }))
              }
            >
              <option value="">— Chưa gán —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email || u.username}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hạn hoàn thành">
            <input
              type="date"
              className={inputCls}
              value={form.han}
              onChange={(e) => setForm((f) => ({ ...f, han: e.target.value }))}
            />
          </Field>
        </div>
        <Field label="Tuần theo dõi">
          <input
            type="text"
            className={inputCls}
            value={form.tuan}
            onChange={(e) => setForm((f) => ({ ...f, tuan: e.target.value }))}
            placeholder="VD: Tuần 1 - 6/2026"
          />
        </Field>
        <Field label="Trạng thái">
          <div className="flex gap-2">
            {TRANG_THAI.map((tt) => (
              <button
                key={tt}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tt }))}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  form.tt === tt
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
                }`}
              >
                {tt}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Ghi chú cập nhật">
          <textarea
            className={`${inputCls} h-20 resize-y py-2`}
            value={form.ghiChu}
            onChange={(e) =>
              setForm((f) => ({ ...f, ghiChu: e.target.value }))
            }
            placeholder="Tiến độ cụ thể, kết quả..."
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
