import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import { btnSecondary } from "../../components/ui/PageShell";
import type { BangKiemData } from "./useBangKiemData";

// Cảnh báo điều kiện chưa khớp Lịch đánh giá + banner vị trí đang chấm kèm 2
// nút thao tác nhanh (Tất cả Đạt / Bỏ chấm).
export default function ChecklistToolbar({ bk }: { bk: BangKiemData }) {
  const {
    vitriTypeId,
    items,
    lichCheck,
    vitriTypes,
    maByType,
    viTriChiTietIds,
    viTriChiTiet,
    viewMode,
    guardedSetAll,
  } = bk;

  if (vitriTypeId === "" || items.length === 0) return null;

  return (
    <>
      {/* ── Cảnh báo điều kiện chưa khớp Lịch đánh giá ── */}
      {!lichCheck.ok && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{lichCheck.message}</p>
        </div>
      )}

      {/* ── Banner vị trí + thao tác nhanh ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-25 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/5">
        <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
          📍 {vitriTypes.find((v) => v.id === vitriTypeId)?.ten_vitri}
          {(() => {
            const sel = (maByType.get(Number(vitriTypeId)) || [])
              .filter((r) => viTriChiTietIds.includes(r.id))
              .map((r) => r.ma_vitri);
            const label = sel.length > 0 ? sel.join(", ") : viTriChiTiet;
            return label ? (
              <span className="text-brand-500"> · {label}</span>
            ) : null;
          })()}
          {viewMode === "edit" && (
            <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              Đang sửa
            </span>
          )}
          <span className="ml-2 text-xs font-normal text-gray-400">
            {items.length} tiêu chí
          </span>
        </p>
        <div className="flex gap-2">
          <button className={btnSecondary} onClick={() => guardedSetAll(1)}>
            <Check size={15} className="text-emerald-500" /> Tất cả Đạt
          </button>
          <button className={btnSecondary} onClick={() => guardedSetAll(null)}>
            <RotateCcw size={15} /> Bỏ chấm
          </button>
        </div>
      </div>
    </>
  );
}
