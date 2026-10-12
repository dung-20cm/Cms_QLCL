import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sheet,
} from "lucide-react";
import { btnPrimary, btnSecondary, Modal } from "../../components/ui/PageShell";
import { checkGoogleOrigin, formatBytes } from "../../features/qlcl/googleSheets";
import type { ConnectSheetData } from "./useConnectSheet";

const STEP_LABEL: Record<string, string> = {
  connecting: "Đang mở cửa sổ đăng nhập Google...",
  "checking-quota": "Đang kiểm tra dung lượng Google Drive...",
  "uploading-images": "Đang lưu ảnh thu nhỏ lên Google Drive...",
  creating: "Đang tạo file trên Google Sheet...",
};

export default function ConnectSheetModal({ c }: { c: ConnectSheetData }) {
  const { open, step, error, estimate, resultUrl, fileTitle, progressText, notice, resultNote, hasImages, closeModal, connect } = c;

  const originCheck = checkGoogleOrigin();
  const busy = step === "connecting" || step === "checking-quota" || step === "creating";

  return (
    <Modal open={open} title="Kết nối Google Sheet" onClose={closeModal}>
      {step === "estimating" && (
        <div className="flex flex-col items-center gap-3 py-6 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={22} className="animate-spin text-brand-500" />
          Đang tính dữ liệu sẽ ghi...
          {progressText && <span className="text-xs text-gray-400">{progressText}</span>}
        </div>
      )}

      {(step === "confirm" || busy || step === "error") && estimate && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40">
            <p className="font-medium text-gray-700 dark:text-gray-200">
              Tên file sẽ tạo: <span className="text-brand-600 dark:text-brand-400">{fileTitle}</span>
            </p>
            <ul className="mt-2 space-y-1 text-gray-500 dark:text-gray-400">
              <li>• {estimate.totalSheets} sheet, {estimate.totalRows.toLocaleString("vi-VN")} dòng dữ liệu</li>
              <li>• Ước tính dung lượng: <strong>~{formatBytes(estimate.bytes)}</strong></li>
              {estimate.imageCount > 0 && (
                <li>
                  • {estimate.imageCount} ảnh thu nhỏ (~{formatBytes(estimate.imageBytes)}) sẽ được lưu
                  trong thư mục <strong>{fileTitle}</strong> trên Google Drive của bạn (riêng tư, tính vào
                  dung lượng Drive) để hiện trong cột "Ảnh"
                </li>
              )}
            </ul>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Bấm "Đồng ý kết nối" sẽ mở cửa sổ đăng nhập Google để bạn chọn tài khoản lưu file.
            Dữ liệu được ghi thẳng từ trình duyệt của bạn sang Google Sheet, hệ thống không lưu
            lại thông tin đăng nhập Google.
          </p>

          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Địa chỉ trang hiện tại: <code>{originCheck.origin}</code> — phải trùng đúng với mục
            "Authorized JavaScript origins" của OAuth Client trên Google Cloud.
          </p>

          {notice && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              {notice}
            </div>
          )}

          {originCheck.problem && step === "confirm" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{originCheck.problem}</span>
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
              <Loader2 size={16} className="animate-spin shrink-0" />
              <span>
                {STEP_LABEL[step]}
                {progressText && <span className="block text-xs opacity-80">{progressText}</span>}
              </span>
            </div>
          )}

          {step === "error" && error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {step === "error" && !estimate && error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 size={32} className="text-emerald-500" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Đã tạo file Google Sheet thành công.
          </p>
          <p className="text-xs text-gray-400">
            Nếu tab mới chưa tự mở (trình duyệt chặn popup), bấm nút bên dưới để mở.
          </p>
          {hasImages && (
            <p className="max-w-sm rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
              Lần đầu mở file, Google hiện thanh vàng <strong>"Cho phép truy cập"</strong> (vì cột Ảnh gọi
              dữ liệu từ Drive) — bấm 1 lần để ảnh hiện ra. Ai cần xem ảnh phải có quyền truy cập thư mục
              ảnh trên Drive.
            </p>
          )}
          {resultNote && (
            <p className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {resultNote}
            </p>
          )}
          {resultUrl && (
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={btnPrimary}
            >
              <ExternalLink size={15} /> Mở Google Sheet
            </a>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {step !== "success" && (
          <button className={btnSecondary} onClick={closeModal} disabled={busy}>
            Huỷ
          </button>
        )}
        {step === "confirm" && (
          <button className={btnPrimary} onClick={connect}>
            <Sheet size={15} /> Đồng ý kết nối
          </button>
        )}
        {step === "error" && estimate && (
          <button className={btnPrimary} onClick={connect}>
            <Sheet size={15} /> Thử lại
          </button>
        )}
        {step === "success" && (
          <button className={btnSecondary} onClick={closeModal}>
            Đóng
          </button>
        )}
      </div>
    </Modal>
  );
}
