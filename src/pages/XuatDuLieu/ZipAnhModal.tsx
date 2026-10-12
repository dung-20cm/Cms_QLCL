import { useEffect, useState } from "react";
import { AlertTriangle, Archive, Info, Loader2 } from "lucide-react";
import { btnPrimary, btnSecondary, Modal } from "../../components/ui/PageShell";
import {
  fetchZipAnh5SInfo,
  zipAnh5SUrl,
  type ZipAnh5SInfo,
} from "../../features/qlcl/api";
import { formatBytes } from "../../features/qlcl/googleSheets";
import { buildExportBaseName } from "./dataFetch";
import { BANG_BY_KEY } from "./constants";

// Popup "Tải ZIP ảnh": hỏi backend số ảnh + dung lượng trước, người dùng đồng ý
// mới bắt đầu tải. File ZIP do backend STREAM thẳng về trình duyệt (không qua bộ
// nhớ của trang, không nén lại) nên dùng được cả với hàng chục nghìn ảnh.
export default function ZipAnhModal({
  open,
  onClose,
  tuNgay,
  denNgay,
}: {
  open: boolean;
  onClose: () => void;
  tuNgay: string;
  denNgay: string;
}) {
  const [info, setInfo] = useState<ZipAnh5SInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Component chỉ được mount khi popup mở (xem index.tsx) nên state luôn bắt đầu
  // sạch; "Thử lại" tăng reloadKey để chạy lại effect.
  useEffect(() => {
    let alive = true;
    fetchZipAnh5SInfo({ tu_ngay: tuNgay || undefined, den_ngay: denNgay || undefined })
      .then((r) => {
        if (alive) setInfo(r);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "Không lấy được thông tin ảnh.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tuNgay, denNgay, reloadKey]);

  function retry() {
    setLoading(true);
    setError(null);
    setInfo(null);
    setReloadKey((k) => k + 1);
  }

  const fileBase = buildExportBaseName([BANG_BY_KEY["anh-5s"]], tuNgay, denNgay);

  function startDownload() {
    // Trình duyệt tự tải file (Content-Disposition: attachment) -- không rời khỏi trang.
    const a = document.createElement("a");
    a.href = zipAnh5SUrl({
      tu_ngay: tuNgay || undefined,
      den_ngay: denNgay || undefined,
      ten: fileBase,
    });
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStarted(true);
  }

  return (
    <Modal open={open} title="Tải ZIP ảnh gốc (Ảnh 5S)" onClose={onClose}>
      {loading && (
        <div className="flex flex-col items-center gap-3 py-6 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={22} className="animate-spin text-brand-500" />
          Đang tính số ảnh...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {info && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40">
            <p className="font-medium text-gray-700 dark:text-gray-200">
              Tên file: <span className="text-brand-600 dark:text-brand-400">{fileBase}.zip</span>
            </p>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>• {info.count.toLocaleString("vi-VN")} ảnh</li>
              <li>
                • Dung lượng ảnh trên máy chủ: <strong>~{formatBytes(info.bytes)}</strong>
                {info.remote > 0 && ` (chưa tính ${info.remote} ảnh cũ lưu ngoài, sẽ được tải thêm vào)`}
              </li>
              <li>• Xếp theo thư mục: Khoa/Phòng → Tháng → tên file ảnh</li>
            </ul>
          </div>
          {info.missing > 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {info.missing} ảnh bị mất file trên máy chủ nên sẽ không có trong ZIP.
            </div>
          )}
          <p className="flex items-start gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <Info size={13} className="mt-0.5 shrink-0" />
            Máy chủ gửi file về trực tiếp, không cần chờ trong trang. Dữ liệu nhiều có thể
            mất vài phút — trình duyệt hiển thị tiến độ ở thanh tải xuống. Cột "Đường dẫn trong ZIP"
            ở file Excel trỏ đúng vào từng ảnh trong gói này.
          </p>
          {started && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
              Đã gửi yêu cầu tải — xem thanh tải xuống của trình duyệt.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className={btnSecondary} onClick={onClose}>
          Đóng
        </button>
        {error && (
          <button className={btnPrimary} onClick={retry}>
            Thử lại
          </button>
        )}
        {info && info.count > 0 && (
          <button className={btnPrimary} onClick={startDownload}>
            <Archive size={15} /> {started ? "Tải lại" : "Tải ZIP"}
          </button>
        )}
      </div>
    </Modal>
  );
}
