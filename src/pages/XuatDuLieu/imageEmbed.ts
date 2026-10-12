// Lấy ảnh minh chứng để NHÚNG vào ô Excel / Google Sheet.
//
// Cách chính: gọi route ảnh THU NHỎ của backend (`/api/photo-gallery/thumb/:id`,
// ~240x180, vài KB, backend tự tạo + cache) bằng chính trình duyệt admin đang
// đăng nhập (token trong query) -- nhẹ hơn tải ảnh gốc (vài trăm KB) ~50 lần và
// không cần giải mã/thu nhỏ ảnh lớn ở trình duyệt. Nếu route thumbnail không
// dùng được (VD backend bản cũ) thì rơi về cách cũ: tải ảnh gốc rồi thu nhỏ
// bằng canvas.
import { photoImageUrl, photoThumbUrl } from "../../features/qlcl/api";

// Kích thước HIỂN THỊ trong ô Excel (px) -- ảnh thumbnail 240x180 được co về cỡ này.
const DISPLAY_MAX_W = 150;
const DISPLAY_MAX_H = 110;
const FALLBACK_QUALITY = 0.68;

export interface EmbeddedThumb {
  base64: string; // data URI đầy đủ -- ExcelJS tự cắt phần "data:...;base64,"
  blob: Blob; // cùng ảnh đó dạng nhị phân -- dùng để tải lên Google Drive (kết nối Sheet)
  width: number; // kích thước hiển thị gợi ý (Excel)
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không đọc được ảnh"));
    reader.readAsDataURL(blob);
  });
}

function fitDisplay(w: number, h: number) {
  const scale = Math.min(DISPLAY_MAX_W / w, DISPLAY_MAX_H / h, 1);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

async function fetchBackendThumb(photoId: number): Promise<EmbeddedThumb | null> {
  const res = await fetch(photoThumbUrl(photoId));
  // Backend trả lỗi xác thực dưới dạng JSON (HTTP 200) -> phải kiểm tra loại nội dung.
  if (!res.ok || !(res.headers.get("content-type") || "").startsWith("image/")) return null;
  const blob = await res.blob();
  const base64 = await blobToDataUrl(blob);
  const img = await loadImageEl(base64);
  return { base64, blob, ...fitDisplay(img.naturalWidth, img.naturalHeight) };
}

// Cách dự phòng: tải ảnh gốc rồi thu nhỏ bằng canvas (blob: URL cùng origin nên
// canvas không bị "taint").
async function fetchAndResizeOriginal(photoId: number): Promise<EmbeddedThumb | null> {
  let objectUrl: string | null = null;
  try {
    const res = await fetch(photoImageUrl(photoId));
    if (!res.ok) return null;
    objectUrl = URL.createObjectURL(await res.blob());
    const img = await loadImageEl(objectUrl);
    const { width: w, height: h } = fitDisplay(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", FALLBACK_QUALITY);
    const blob = await (await fetch(dataUrl)).blob();
    return { base64: dataUrl, blob, width: w, height: h };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// null nếu ảnh lỗi/không tải được -- để caller tự fallback về hiện text, không
// làm hỏng cả file xuất.
export async function fetchPhotoThumbnail(photoId: number): Promise<EmbeddedThumb | null> {
  try {
    const t = await fetchBackendThumb(photoId);
    if (t) return t;
  } catch {
    // rơi xuống cách dự phòng bên dưới
  }
  try {
    return await fetchAndResizeOriginal(photoId);
  } catch {
    return null;
  }
}

// Chạy `fn` cho từng phần tử của `items` với tối đa `limit` tác vụ song song
// cùng lúc -- tránh bắn hàng chục request cùng 1 lúc nhưng vẫn nhanh hơn chạy
// tuần tự từng ảnh 1.
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
// Sheet. Phần tử null = ảnh lỗi/thiếu id. Thumbnail chỉ vài KB nên chạy 8 luồng song song.
export function fetchThumbsForRows(
  rows: { id?: string | number | null }[],
  onProgress?: (done: number, total: number) => void,
): Promise<(EmbeddedThumb | null)[]> {
  return mapWithConcurrency(
    rows,
    8,
    (r) => {
      const id = r.id != null ? Number(r.id) : NaN;
      return Number.isFinite(id) && id > 0 ? fetchPhotoThumbnail(id) : Promise.resolve(null);
    },
    onProgress,
  );
}
