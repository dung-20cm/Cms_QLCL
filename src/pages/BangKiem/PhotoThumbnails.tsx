import { X } from "lucide-react";
import { photoImageUrl } from "../../features/qlcl/api";
import type { BangKiemData } from "./useBangKiemData";

// Thumbnail ảnh minh chứng (đã lưu + vừa chọn) -- viền xanh sidebar, hover
// nổi lên, nút ✕ nổi ra ngoài góc ảnh.
export default function PhotoThumbnails({ bk }: { bk: BangKiemData }) {
  const {
    existingPhotos,
    photos,
    photoPreviews,
    deletingPhotoId,
    removeExistingPhoto,
    removeQueuedPhoto,
  } = bk;

  if (existingPhotos.length === 0 && photos.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {existingPhotos.map((p) => (
        <div key={`existing-${p.id}`} className="group relative h-16 w-16 shrink-0">
          <div className="h-full w-full overflow-hidden rounded-lg border-2 border-[#185FA5]/30 shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[#185FA5] group-hover:shadow-lg group-hover:shadow-[#185FA5]/25">
            <img
              src={photoImageUrl(p.id)}
              alt={p.ten_file || "Ảnh minh chứng"}
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-110"
            />
          </div>
          <button
            type="button"
            onClick={() => removeExistingPhoto(p.id)}
            disabled={deletingPhotoId === p.id}
            title="Xoá ảnh"
            className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition-all duration-150 hover:scale-110 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-gray-900"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      ))}
      {photos.map((f, i) => (
        <div key={`new-${i}`} className="group relative h-16 w-16 shrink-0">
          <div className="h-full w-full overflow-hidden rounded-lg border-2 border-[#185FA5]/30 shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[#185FA5] group-hover:shadow-lg group-hover:shadow-[#185FA5]/25">
            <img
              src={photoPreviews[i]}
              alt={f.name}
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-110"
            />
          </div>
          <button
            type="button"
            onClick={() => removeQueuedPhoto(i)}
            title="Bỏ ảnh này"
            className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition-all duration-150 hover:scale-110 hover:bg-red-600 dark:ring-gray-900"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
