import {
  CheckCheck,
  Database,
  Download,
  FileSpreadsheet,
  Link2,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  Field,
  inputCls,
  PageHeader,
} from "../../components/ui/PageShell";
import BangCard from "./BangCard";
import ConnectSheetModal from "./ConnectSheetModal";
import { BANG_LIST } from "./constants";
import { useConnectSheet } from "./useConnectSheet";
import { useXuatDuLieuData } from "./useXuatDuLieuData";

export default function XuatDuLieu() {
  const t = useXuatDuLieuData();
  const {
    tuNgay,
    setTuNgay,
    denNgay,
    setDenNgay,
    selected,
    toggleBang,
    selectAll,
    clearAll,
    resetFilters,
    exporting,
    exportProgress,
    error,
    done,
    handleExport,
  } = t;

  const connectSheet = useConnectSheet();

  return (
    <div>
      <PageHeader
        icon={<FileSpreadsheet size={22} />}
        title="Xuất dữ liệu"
        subtitle="Xuất dữ liệu toàn hệ thống ra Excel hoặc Google Sheet — mỗi bảng đã chọn nằm ở 1 sheet riêng"
        actions={
          <>
            <button
              className={btnSecondary}
              onClick={() => connectSheet.openModal(selected, tuNgay, denNgay)}
              disabled={selected.size === 0}
            >
              <Link2 size={15} /> Kết nối Sheet
            </button>
            <button
              className={btnPrimary}
              onClick={handleExport}
              disabled={exporting || selected.size === 0}
            >
              <Download size={15} className={exporting ? "animate-spin" : ""} />
              {exporting
                ? exportProgress || "Đang xuất..."
                : `Xuất Excel${selected.size ? ` (${selected.size})` : ""}`}
            </button>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={handleExport} />}

      {done && !error && (
        <div className="animate-fade-in mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCheck size={16} /> Đã xuất file Excel thành công.
        </div>
      )}

      {/* Bộ lọc khoảng thời gian */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Từ ngày">
          <input
            type="date"
            className={inputCls}
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
          />
        </Field>
        <Field label="Đến ngày">
          <input
            type="date"
            className={inputCls}
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
          />
        </Field>
        {(tuNgay || denNgay) && (
          <button className={btnSecondary} onClick={resetFilters}>
            <RotateCcw size={14} /> Xoá lọc ngày
          </button>
        )}
        <span className="pb-2 text-xs text-gray-400">
          Bỏ trống = lấy toàn bộ dữ liệu, không giới hạn thời gian
        </span>
      </div>

      {/* Chọn bảng dữ liệu */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Database size={16} className="text-gray-400" />
          Chọn bảng dữ liệu muốn xuất
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
            onClick={selectAll}
          >
            <CheckCheck size={13} /> Chọn tất cả
          </button>
          <span className="text-gray-300">|</span>
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
            onClick={clearAll}
          >
            <Square size={12} /> Bỏ chọn
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BANG_LIST.map((bang, idx) => (
          <BangCard
            key={bang.key}
            bang={bang}
            selected={selected.has(bang.key)}
            onToggle={() => toggleBang(bang.key)}
            delay={idx * 60}
          />
        ))}
      </div>

      {selected.size === 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
          <X size={13} /> Chưa chọn bảng nào — chọn ít nhất 1 bảng để bật nút Xuất Excel / Kết nối Sheet.
        </p>
      )}

      <ConnectSheetModal c={connectSheet} />
    </div>
  );
}
