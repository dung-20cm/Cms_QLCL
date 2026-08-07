import { CalendarDays, Plus } from "lucide-react";
import {
  btnPrimary,
  ErrorBanner,
  KpiCard,
  LoadingRow,
  PageHeader,
} from "../../components/ui/PageShell";
import ComplianceSection from "./ComplianceSection";
import DayDetailModal from "./DayDetailModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import LichFormModal from "./LichFormModal";
import TodayPanel from "./TodayPanel";
import { useLichDanhGiaData } from "./useLichDanhGiaData";
import WeekGrid from "./WeekGrid";

// Container -- chỉ lo state (qua useLichDanhGiaData) + ghép các khối UI
// (WeekGrid/TodayPanel/ComplianceSection/3 modal) lại với nhau. Không tự chứa
// logic tính toán/JSX chi tiết của từng khối.
export default function LichDanhGia() {
  const lg = useLichDanhGiaData();
  const { canManage, isAdmin, error, load, kpi, loading, openModal } = lg;

  return (
    <div>
      <PageHeader
        icon={<CalendarDays size={22} />}
        title="Lịch đánh giá 5S"
        subtitle="Lịch tuần định kỳ · Kiểm tra đột xuất · Theo dõi tuân thủ cán bộ"
        actions={
          canManage && (
            <button className={btnPrimary} onClick={openModal}>
              <Plus size={16} /> Thêm lịch
            </button>
          )
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="📋 Tổng lịch" value={kpi.total} accent="navy" />
        <KpiCard label="✅ Đã hoàn thành" value={kpi.done} accent="green" />
        <KpiCard label="❌ Chưa thực hiện" value={kpi.miss} accent="red" />
        <KpiCard label="⏳ Sắp tới" value={kpi.upcoming} accent="yellow" />
      </div>

      {loading ? (
        <LoadingRow />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
          {/* ── Lịch tuần ── */}
          <WeekGrid lg={lg} />

          {/* ── Phân công hôm nay ── */}
          <TodayPanel lg={lg} />
        </div>
      )}

      {/* ── Danh sách toàn bộ lịch ── */}
      {/* {!loading && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Toàn bộ lịch phân công ({lichList.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Khoa/Phòng</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Người thực hiện</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {lichList.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-200">
                      {l.khoa?.ten_khoa}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.vitri_type?.ten_vitri || "Tất cả"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.loai_lich === "dinh_ky"
                            ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                        title={
                          l.loai_lich === "dinh_ky"
                            ? "Định kỳ"
                            : l.loai_lich === "dot_xuat"
                              ? "Đột xuất"
                              : "Một lần"
                        }
                      >
                        {l.dot?.ten_dot ||
                          (l.loai_lich === "dinh_ky"
                            ? "Định kỳ"
                            : l.loai_lich === "dot_xuat"
                              ? "Đột xuất"
                              : "Một lần")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.loai_lich === "dinh_ky"
                        ? THU_LABEL[l.thu_trong_tuan || 0] +
                          (l.ngay_thuc_hien
                            ? ` (từ ${fmtVNFromDateStr(l.ngay_thuc_hien)})`
                            : "")
                        : l.ngay_thuc_hien}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.nguoi_thuc_hien?.email ||
                        l.nguoi_thuc_hien?.username ||
                        "—"}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-400">
                      {l.ghi_chu}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteLich(l)}
                          className="text-gray-300 transition hover:text-red-500"
                          title="Xoá lịch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {lichList.length === 0 && (
              <EmptyState message="Chưa có lịch nào được lập" />
            )}
          </div>
        </div>
      )} */}

      {/* ── Trưởng phòng theo dõi tuân thủ lịch ── */}
      {/* Hiện cho Admin (toàn viện) VÀ Trưởng khoa/phòng có quyền phân công lịch
          (canManage) — dữ liệu lichList đã được BACKEND lọc sẵn theo khoa của
          người đăng nhập nếu không phải full-scope, nên hiển thị an toàn, không lộ
          dữ liệu khoa khác. */}
      {!loading && (isAdmin || canManage) && <ComplianceSection lg={lg} />}

      {/* ── Modal thêm / sửa lịch ── */}
      <LichFormModal lg={lg} />

      {/* ── Modal xác nhận xoá lịch ── */}
      <DeleteConfirmModal lg={lg} />

      {/* ── Modal "Xem thêm" — đủ lịch của 1 ngày (khi ngày đó có > 10 buổi) ── */}
      <DayDetailModal lg={lg} />
    </div>
  );
}
