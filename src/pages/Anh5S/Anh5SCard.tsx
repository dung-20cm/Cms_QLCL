import { FileText, Pencil, Trash2, X } from "lucide-react";
import { toneBadgeClass, toneFromPct } from "../../features/qlcl/types";
import { pctFromKetQua } from "./helpers";
import type { PhotoGroup } from "./types";

// Card 1 lượt gửi ảnh — khớp bố cục thẻ trong 5S_Dashboard_BVTB_v4.html: viền
// trái màu theo đạt/chưa đạt, khối đỏ liệt kê tiêu chí không đạt (chỉ có ở
// lượt gắn với 1 đánh giá thật), dải ảnh thu nhỏ có số thứ tự. Sửa/Xoá hiển
// thị cho CẢ 2 loại (đánh giá thật lẫn gửi thủ công) -- không còn ẩn theo loại.
export default function Anh5SCard({
  g,
  failedItems,
  isPass,
  delay,
  onEdit,
  onDeleteGroup,
  onOpenPreview,
  onDeletePhoto,
  isViewOnly,
}: {
  g: PhotoGroup;
  failedItems: { s: string; tc: string }[];
  isPass: boolean;
  delay: number;
  onEdit: () => void;
  onDeleteGroup: () => void;
  onOpenPreview: (index: number) => void;
  onDeletePhoto: (id: number) => void;
  isViewOnly: boolean;
}) {
  const dg = g.dg;
  const manual = g.manual;
  const pct = dg ? dg.pct : pctFromKetQua(manual?.ket_qua ?? null);
  const tagLabel = dg ? dg.xep_loai : manual?.ket_qua || "";
  const borderColor = isPass ? "#1D9E75" : "#E24B4A";
  const khoaTen =
    dg?.khoa?.ten_khoa || manual?.khoa?.ten_khoa || `Lượt #${g.list[0].id}`;
  const vitriTen = dg?.vitri_type?.ten_vitri || manual?.vitri_type?.ten_vitri;

  const nguoiTxt = dg
    ? [
        dg.nguoi_danh_gia?.email || dg.nguoi_danh_gia?.username,
        ...(dg.dong_danh_gia?.map((u) => u.email || u.username) || []),
      ]
        .filter(Boolean)
        .join(" · ")
    : manual?.nguoi_gui?.email || manual?.nguoi_gui?.username;

  return (
    <div
      className="animate-rise-in overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1B3A5C] dark:text-brand-300">
            {khoaTen}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            📍 {vitriTen || "—"} · 👤 {nguoiTxt || "—"}
            {dg?.dot_danh_gia && <> · 🗂 {dg.dot_danh_gia}</>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${toneBadgeClass[toneFromPct(pct)]}`}
          >
            {pct}% {tagLabel}
          </span>
          {!isViewOnly && (
            <>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                title="Sửa lượt này"
                onClick={onEdit}
              >
                <Pencil size={13} />
              </button>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                title="Xoá cả lượt này"
                onClick={onDeleteGroup}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {!isPass && failedItems.length > 0 && (
        <div className="mt-2 rounded-lg border-l-[3px] border-red-400 bg-red-50 px-2.5 py-2 dark:bg-red-500/10">
          <p className="text-[11px] font-bold text-red-700 dark:text-red-400">
            ✗ {failedItems.length} tiêu chí không đạt:
          </p>
          {failedItems.slice(0, 4).map((f, i) => (
            <p
              key={i}
              className="text-[10.5px] leading-snug text-red-900/80 dark:text-red-300/80"
            >
              • [{f.s}] {f.tc}
            </p>
          ))}
          {failedItems.length > 4 && (
            <p className="text-[10.5px] italic text-red-600 dark:text-red-400">
              ... và {failedItems.length - 4} tiêu chí khác
            </p>
          )}
        </div>
      )}

      {manual?.ghi_chu && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <FileText size={12} /> {manual.ghi_chu}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {g.list.map((p, pIdx) => (
          <div
            key={p.id}
            className="group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800"
            style={{ border: `2px solid ${borderColor}` }}
          >
            <button
              onClick={() => onOpenPreview(pIdx)}
              className="block h-full w-full"
            >
              <img
                src={p.url_anh}
                alt={p.ten_file || "Ảnh 5S"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
            <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
              {pIdx + 1}/{g.list.length}
            </span>
            {!isViewOnly && (
              <button
                title="Xoá ảnh này"
                onClick={() => onDeletePhoto(p.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
