import { Pencil, Trash2 } from "lucide-react";
import { btnDanger, btnPrimary, btnSecondary } from "../../components/ui/PageShell";
import type { BangKiemData } from "./useBangKiemData";

// Banner "Đã có kết quả đánh giá" -- hiện khi điều kiện đang chọn đã khớp 1
// đánh giá có sẵn (viewMode === "result").
export default function ResultBanner({ bk }: { bk: BangKiemData }) {
  const {
    viewMode,
    foundRecord,
    isResultToday,
    handleCreateNew,
    canEditDelete,
    enterEditMode,
    foundDetail,
    setConfirmDeleteOpen,
    navigate,
  } = bk;

  if (viewMode !== "result" || !foundRecord) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        ✓ Đã có kết quả đánh giá — {foundRecord.pct}% ({foundRecord.xep_loai})
      </p>
      <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
        {isResultToday
          ? "Bạn chỉ có thể sửa hoặc xoá đánh giá này trong ngày hiện tại — sang ngày hôm sau sẽ bị khoá."
          : "Đánh giá này đã qua ngày đánh giá, không thể sửa/xoá được nữa — chỉ xem."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={btnPrimary} onClick={handleCreateNew}>
          Tạo đánh giá mới
        </button>
        {canEditDelete && isResultToday && (
          <>
            <button
              className={btnSecondary}
              onClick={enterEditMode}
              disabled={!foundDetail}
            >
              <Pencil size={14} /> Sửa
            </button>
            <button
              className={btnDanger}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 size={14} /> Xoá
            </button>
          </>
        )}
        <button className={btnSecondary} onClick={() => navigate("/tong-hop")}>
          Xem tổng hợp
        </button>
        <button
          className={btnSecondary}
          onClick={() => navigate("/tien-do-kp")}
        >
          Xem tiến độ khắc phục
        </button>
      </div>
    </div>
  );
}
