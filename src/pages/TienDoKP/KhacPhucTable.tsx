import { Pencil, Trash2, Wrench } from "lucide-react";
import { EmptyState, LoadingRow } from "../../components/ui/PageShell";
import Pagination from "../../components/ui/Pagination";
import { S_META } from "./constants";
import { isQuaHan, soNgayConLai, ttBadge } from "./helpers";
import ProgressBar5 from "./ProgressBar5";
import type { TienDoKPData } from "./useTienDoKPData";

export default function KhacPhucTable({ t }: { t: TienDoKPData }) {
  const {
    loading,
    filtered,
    pagedRows,
    isViewOnly,
    openEdit,
    setConfirmDelete,
    page,
    totalPages,
    setPage,
    totalItems,
    pageSize,
  } = t;

  if (loading) return <LoadingRow />;
  if (filtered.length === 0)
    return (
      <EmptyState
        icon={<Wrench size={36} />}
        message="Chưa có hành động khắc phục nào trong tuần này"
      />
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
              <th className="px-5 py-3 font-medium">
                Khoa / Vị trí / S / Lỗi phát hiện
              </th>
              <th className="px-4 py-3 font-medium">Hành động khắc phục</th>
              <th className="px-4 py-3 font-medium">Người phụ trách</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                📅 Ngày phát hiện
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">
                ⏱ Tiến độ (5 ngày LV)
              </th>
              <th className="px-4 py-3 font-medium">Hạn xử lý</th>
              <th className="px-4 py-3 font-medium">Tuần</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Ghi chú</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => {
              const dgct = r.danh_gia_chi_tiet;
              const sId = r.s_id || dgct?.checklist_item?.s_id;
              const sMeta = sId ? S_META[sId] : undefined;
              const loiText =
                r.mo_ta_loi ||
                dgct?.checklist_item?.tc ||
                dgct?.ghi_chu ||
                "—";
              const quaHan = isQuaHan(r);
              const conLai = soNgayConLai(r.han_xu_ly);
              return (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 align-top last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <td className="max-w-[280px] px-5 py-3">
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {r.khoa?.ten_khoa || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {r.vitri_type?.ten_vitri}
                      {sMeta && (
                        <span
                          className="ml-1 rounded px-1 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: sMeta.bg,
                            color: sMeta.color,
                          }}
                        >
                          {sId} · {sMeta.name}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {loiText}
                    </p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-gray-600 dark:text-gray-300">
                    {r.hanh_dong_khac_phuc || (
                      <span className="text-gray-300">Chưa cập nhật</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {r.nguoi_phu_trach?.email ||
                      r.nguoi_phu_trach?.username ||
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {r.ngay_phat_hien
                      ? new Date(r.ngay_phat_hien).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar5 r={r} />
                  </td>
                  <td
                    className={`px-4 py-3 ${quaHan ? "font-semibold text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {r.han_xu_ly
                      ? new Date(r.han_xu_ly).toLocaleDateString("vi-VN")
                      : "—"}
                    {conLai != null && r.trang_thai !== "Đã xong" && (
                      <p className="mt-0.5 text-[11px] font-normal">
                        {conLai < 0
                          ? `Quá hạn ${Math.abs(conLai)} ngày`
                          : conLai === 0
                            ? "Hết hạn hôm nay"
                            : `Còn ${conLai} ngày`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {r.tuan}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ttBadge(r.trang_thai, quaHan)}`}
                    >
                      {quaHan ? `⚠ Quá hạn` : r.trang_thai}
                    </span>
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {r?.ghi_chu ? (
                      <p className="line-clamp-2">{r.ghi_chu}</p>
                    ) : (
                      <p className="line-clamp-2">
                        {r?.danh_gia_chi_tiet?.ghi_chu || "—"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!isViewOnly && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700"
                          title="Cập nhật tiến độ"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(r)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700"
                          title="Xoá hành động"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
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
