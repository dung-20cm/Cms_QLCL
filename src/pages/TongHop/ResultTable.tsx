import { Table2 } from "lucide-react";
import { EmptyState, LoadingRow } from "../../components/ui/PageShell";
import Pagination from "../../components/ui/Pagination";
import { toneBadgeClass, toneFromPct } from "../../features/qlcl/types";
import type { TongHopData } from "./useTongHopData";

export default function ResultTable({ t }: { t: TongHopData }) {
  const {
    loading,
    filtered,
    pagedRows,
    page,
    pageSize,
    totalPages,
    setPage,
    totalItems,
  } = t;

  if (loading) return <LoadingRow />;
  if (filtered.length === 0)
    return (
      <EmptyState
        icon={<Table2 size={36} />}
        message="Chưa có dữ liệu — hoàn thành bảng kiểm và bấm Lưu kết quả"
      />
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Ngày</th>
              <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
              <th className="px-4 py-3 font-medium">Vị trí</th>
              <th className="px-4 py-3 font-medium">Đợt</th>
              <th className="px-4 py-3 font-medium">Người ĐG</th>
              <th className="px-4 py-3 font-medium">Tiêu chí</th>
              <th className="px-4 py-3 font-medium">% Đạt</th>
              <th className="px-4 py-3 font-medium">Xếp loại</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r, i) => (
              <tr
                key={r.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
              >
                <td className="px-5 py-3 text-gray-400">
                  {(page - 1) * pageSize + i + 1}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                  {r.khoa?.ten_khoa}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {r.vitri_type?.ten_vitri}
                  {r.vitri_chi_tiet?.ma_vitri && (
                    <span className="text-gray-300">
                      {" "}
                      · {r.vitri_chi_tiet.ma_vitri}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {r.dot_danh_gia}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {[
                    r.nguoi_danh_gia?.email,
                    ...(r.dong_danh_gia?.map((u) => u.email) || []),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {r.so_tieu_chi_dat}/{r.so_tieu_chi_tong}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full ${r.pct >= 90 ? "bg-emerald-500" : r.pct >= 75 ? "bg-sky-500" : r.pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {r.pct}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}
                  >
                    {r.xep_loai}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />
    </div>
  );
}
