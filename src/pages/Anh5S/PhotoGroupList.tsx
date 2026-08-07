import Anh5SCard from "./Anh5SCard";
import type { Anh5SData } from "./useAnh5SData";

// Danh sách các lượt ảnh của TRANG hiện tại, gom theo ngày -- mỗi ngày 1 khối
// hiện tổng số lượt/ảnh + số đạt/chưa đạt trong ngày đó.
export default function PhotoGroupList({ a }: { a: Anh5SData }) {
  const {
    dateGroups,
    isPassGroup,
    failedItemsFor,
    isViewOnly,
    openEdit,
    setDeleting,
    openPreview,
  } = a;

  return (
    <div>
      {dateGroups.map(([dateKey, list]) => {
        const totalPhotos = list.reduce((s, g) => s + g.list.length, 0);
        const datCount = list.filter(isPassGroup).length;
        const kdatCount = list.length - datCount;
        const dateLabel =
          dateKey === "—"
            ? "Không rõ ngày"
            : new Date(dateKey).toLocaleDateString("vi-VN");
        return (
          <div key={dateKey} className="mb-5">
            <div className="mb-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
              <span className="text-sm font-bold text-[#1B3A5C] dark:text-brand-300">
                📅 {dateLabel}
              </span>
              <span className="text-xs text-gray-400">
                {list.length} lượt · {totalPhotos} ảnh
              </span>
              {datCount > 0 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  ✅ {datCount} đạt
                </span>
              )}
              {kdatCount > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  ❌ {kdatCount} không đạt
                </span>
              )}
            </div>
            <div className="space-y-3">
              {list.map((g, i) => (
                <Anh5SCard
                  key={g.key}
                  g={g}
                  failedItems={g.dg ? failedItemsFor(g.dg.id) : []}
                  isPass={isPassGroup(g)}
                  delay={Math.min(i, 6) * 60}
                  onEdit={() => openEdit(g)}
                  onDeleteGroup={() =>
                    setDeleting({
                      ids: g.list.map((p) => p.id),
                      label: `cả lượt (${g.list.length} ảnh) của ${
                        g.dg?.khoa?.ten_khoa || g.manual?.khoa?.ten_khoa || ""
                      }`,
                    })
                  }
                  onOpenPreview={(idx) => openPreview(g.list, idx)}
                  onDeletePhoto={(id) =>
                    setDeleting({ ids: [id], label: "ảnh này" })
                  }
                  isViewOnly={isViewOnly}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
