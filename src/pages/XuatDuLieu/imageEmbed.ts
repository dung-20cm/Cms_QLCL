// Tải ảnh minh chứng thật từ backend để NHÚNG trực tiếp vào ô Excel -- cùng kỹ
// thuật đã dùng ở features/qlcl/exportAnh5SPpt.ts (pptxgenjs `addImage({path})`):
// gọi đúng route có xác thực `GET /api/photo-gallery/image/:id?token=...` bằng
// chính trình duyệt admin đang đăng nhập (browser tự gửi token trong query --
// không phải máy chủ ngoài gọi vào như Google Sheets `=IMAGE()`, nên không bị
// chặn bởi mạng nội bộ/token hết hạn). Khác với PPT (pptxgenjs tự fetch + nhúng
// nguyên ảnh), ở đây ta tự fetch rồi RESIZE XUỐNG THUMBNAIL bằng canvas trước
// khi nhúng -- bắt buộc, nếu không mỗi ảnh gốc backend lưu tới 1600x1600 sẽ
// khiến file Excel nặng gấp chục lần mức cần để xem trong 1 ô nhỏ.
import { photoImageUrl } from "../../features/qlcl/api";

const THUMB_MAX_W = 150;
const THUMB_MAX_H = 110;
const THUMB_QUALITY = 0.68;

export interface EmbeddedThumb {
  base64: string; // data URI đầy đủ -- ExcelJS tự cắt phần "data:...;base64," ở đầu
  width: number;
  height: number;
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không tải được ảnh"));
    img.src = src;
  });
}

// null nếu ảnh lỗi/không tải được -- để caller tự fallback về hiện text, không
// làm hỏng cả file xuất.
export async function fetchPhotoThumbnail(photoId: number): Promise<EmbeddedThumb | null> {
  let objectUrl: string | null = null;
  try {
    const res = await fetch(photoImageUrl(photoId));
    if (!res.ok) return null;
    const blob = await res.blob();

    // Tạo blob: URL để load vào thẻ <img> rồi vẽ qua canvas -- blob: URL cùng
    // origin với trang đang chạy (không phải fetch thẳng URL backend vào thẻ
    // <img>) nên canvas không bị "taint", gọi toDataURL() được bình thường.
    objectUrl = URL.createObjectURL(blob);
    const img = await loadImageEl(objectUrl);

    const scale = Math.min(THUMB_MAX_W / img.width, THUMB_MAX_H / img.height, 1);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    return { base64: canvas.toDataURL("image/jpeg", THUMB_QUALITY), width: w, height: h };
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// Chạy `fn` cho từng phần tử của `items` với tối đa `limit` tác vụ song song
// cùng lúc -- tránh bắn hàng chục request tải ảnh cùng 1 lúc (dễ bị backend/
// trình duyệt nghẽn) nhưng vẫn nhanh hơn chạy tuần tự từng ảnh 1.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let doneCount = 0;

  async function worker() {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      doneCount += 1;
      onProgress?.(doneCount, items.length);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Tải thumbnail cho 1 danh sách dòng của bảng "Ảnh 5S" (mỗi dòng có field `id`
// = id bản ghi photo_gallery) -- dùng chung cho xuất Excel lẫn kết nối Google
// Sheet để 2 đường luôn lấy ảnh giống hệt nhau. Phần tử null = ảnh lỗi/thiếu id.
export function fetchThumbsForRows(
  rows: { id?: string | number | null }[],
  onProgress?: (done: number, total: number) => void,
): Promise<(EmbeddedThumb | null)[]> {
  return mapWithConcurrency(
    rows,
    4,
    (r) => {
      const id = r.id != null ? Number(r.id) : NaN;
      return Number.isFinite(id) && id > 0 ? fetchPhotoThumbnail(id) : Promise.resolve(null);
    },
    onProgress,
  );
}
