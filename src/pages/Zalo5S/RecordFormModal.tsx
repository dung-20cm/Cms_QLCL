import {
  btnPrimary,
  btnSecondary,
  Field,
  inputCls,
  Modal,
} from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { CHAT_LUONG_OPTIONS } from "./constants";
import type { Zalo5SData } from "./useZalo5SData";

export default function RecordFormModal({ z }: { z: Zalo5SData }) {
  const {
    modalOpen,
    setModalOpen,
    editing,
    save,
    saving,
    mKhoa,
    setMKhoa,
    khoaList,
    mTuan,
    setMTuan,
    mSoAnh,
    setMSoAnh,
    mViTri,
    setMViTri,
    mConfigTypes,
    mChatLuong,
    setMChatLuong,
    mGhiChu,
    setMGhiChu,
    modalError,
  } = z;

  return (
    <Modal
      open={modalOpen}
      title={editing ? "Cập nhật ghi nhận ảnh 5S" : "Ghi nhận ảnh 5S"}
      onClose={() => setModalOpen(false)}
      footer={
        <>
          <button className={btnSecondary} onClick={() => setModalOpen(false)}>
            Huỷ
          </button>
          <button className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Khoa / Phòng / TT">
          <SearchableSelect
            value={mKhoa}
            onChange={setMKhoa}
            options={khoaList.map((k) => ({
              value: k.id,
              label: k.ten_khoa,
            }))}
            placeholder="— Chọn khoa —"
          />
        </Field>
        <Field label="Tuần (tự quy về thứ 2 đầu tuần)">
          <input
            type="date"
            className={inputCls}
            value={mTuan}
            onChange={(e) => setMTuan(e.target.value)}
          />
        </Field>
        <Field label="Số ảnh đã gửi">
          <input
            type="number"
            min={0}
            max={50}
            className={inputCls}
            value={mSoAnh}
            onChange={(e) => setMSoAnh(Number(e.target.value))}
          />
        </Field>
        <Field label={`Vị trí đã gửi ảnh (${mViTri.length} đã chọn)`}>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
            {mConfigTypes.map((v) => {
              const on = mViTri.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    setMViTri((p) =>
                      on ? p.filter((x) => x !== v.id) : [...p, v.id],
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    on
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {v.ten_vitri}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Chất lượng ảnh">
          <select
            className={inputCls}
            value={mChatLuong}
            onChange={(e) => setMChatLuong(e.target.value)}
          >
            {CHAT_LUONG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ghi chú">
          <input
            className={inputCls}
            value={mGhiChu}
            onChange={(e) => setMGhiChu(e.target.value)}
            placeholder="VD: Thiếu ảnh tủ thuốc, ảnh buồng bệnh mờ..."
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
