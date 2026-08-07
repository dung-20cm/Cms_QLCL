import { KpiCard, inputCls } from "../../components/ui/PageShell";
import ComplianceDetailTable from "./ComplianceDetailTable";
import ComplianceSummaryTable from "./ComplianceSummaryTable";
import type { LichDanhGiaData } from "./useLichDanhGiaData";

// "Trưởng phòng theo dõi tuân thủ lịch" -- hiện cho Admin (toàn viện) VÀ
// Trưởng khoa/phòng có quyền phân công lịch (canManage). Dữ liệu đã được
// BACKEND lọc sẵn theo khoa của người đăng nhập nếu không phải full-scope,
// nên hiển thị an toàn, không lộ dữ liệu khoa khác.
export default function ComplianceSection({ lg }: { lg: LichDanhGiaData }) {
  const {
    ttRange,
    setTtRange,
    ttNguoi,
    setTtNguoi,
    canBoOptions,
    ttKpi,
    ttSummary,
    ttDetail,
    todayStr,
    isDone,
  } = lg;

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          📊 Trưởng phòng theo dõi tuân thủ lịch
        </h3>
        <div className="flex gap-2">
          <select
            className={inputCls}
            style={{ fontSize: 12, padding: "3px 8px" }}
            value={ttRange}
            onChange={(e) => setTtRange(e.target.value as "week" | "all")}
          >
            <option value="week">Tuần này</option>
            <option value="all">Tất cả (60 ngày)</option>
          </select>
          <select
            className={inputCls}
            style={{ fontSize: 12, padding: "3px 8px", minWidth: 160 }}
            value={ttNguoi}
            onChange={(e) => setTtNguoi(e.target.value)}
          >
            <option value="">— Tất cả cán bộ —</option>
            {canBoOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email || u.username}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-5">
        {/* KPI */}
        <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label="📋 Tổng lịch" value={ttKpi.total} accent="navy" />
          <KpiCard label="✅ Đã hoàn thành" value={ttKpi.done} accent="green" />
          <KpiCard label="❌ Chưa thực hiện" value={ttKpi.miss} accent="red" />
          <KpiCard label="⏳ Sắp tới" value={ttKpi.upcoming} accent="yellow" />
        </div>

        {/* Tóm tắt theo cán bộ */}
        {!ttNguoi && ttSummary.length > 0 && (
          <ComplianceSummaryTable rows={ttSummary} />
        )}

        {/* Chi tiết từng lịch */}
        <ComplianceDetailTable
          rows={ttDetail}
          todayStr={todayStr}
          isDone={isDone}
        />
      </div>
    </div>
  );
}
