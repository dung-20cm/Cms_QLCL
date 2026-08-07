import { Camera, Save } from "lucide-react";
import { btnPrimary, btnSecondary } from "../../components/ui/PageShell";
import { toneBadgeClass } from "../../features/qlcl/types";
import PhotoThumbnails from "./PhotoThumbnails";
import type { BangKiemData } from "./useBangKiemData";

// Khối "Kết quả + lưu" -- % đạt, xếp loại, nút ảnh minh chứng, nút lưu, dải
// thumbnail ảnh, thanh tiến độ, trạng thái/lỗi lưu.
export default function SaveBar({ bk }: { bk: BangKiemData }) {
  const {
    items,
    stats,
    xl,
    existingPhotos,
    photos,
    addPhotos,
    viewMode,
    setViewMode,
    readyToSave,
    saving,
    handleSave,
    photoStatus,
    lichCheck,
    saveError,
  } = bk;

  if (items.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div>
            <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">
              {stats.pct}%
            </p>
            <p className="text-xs text-gray-400">
              {stats.dat}/{stats.tong} tiêu chí đạt · đã chấm{" "}
              {stats.danhGiaXong}/{stats.tong}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${toneBadgeClass[xl.tone]}`}
          >
            {xl.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className={btnSecondary}>
            <Camera size={15} />
            Ảnh minh chứng
            {existingPhotos.length + photos.length > 0 &&
              ` (${existingPhotos.length + photos.length})`}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {viewMode === "edit" && (
            <button className={btnSecondary} onClick={() => setViewMode("result")}>
              Huỷ sửa
            </button>
          )}
          <button
            className={btnPrimary}
            disabled={!readyToSave || saving}
            onClick={handleSave}
          >
            <Save size={15} />{" "}
            {saving ? "Đang lưu..." : viewMode === "edit" ? "Cập nhật" : "Lưu kết quả"}
          </button>
        </div>
      </div>

      {/* ── Thumbnail ảnh minh chứng (đã lưu + vừa chọn) ── */}
      <PhotoThumbnails bk={bk} />

      {/* progress bar */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all ${stats.pct >= 90 ? "bg-emerald-500" : stats.pct >= 75 ? "bg-sky-500" : stats.pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${stats.pct}%` }}
        />
      </div>

      {photoStatus && <p className="mt-2 text-xs text-gray-400">{photoStatus}</p>}
      {!readyToSave && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          {lichCheck.ok
            ? `⚠ Cần chọn khoa, vị trí và chấm đủ ${stats.tong} tiêu chí trước khi lưu.`
            : "⚠ Điều kiện đang chọn chưa khớp Lịch đánh giá — xem cảnh báo phía trên."}
        </p>
      )}
      {saveError && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          ✗ {saveError}
        </p>
      )}
    </div>
  );
}
