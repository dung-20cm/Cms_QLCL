import { Download, Table2 } from "lucide-react";
import { btnSecondary, ErrorBanner, PageHeader } from "../../components/ui/PageShell";
import FilterBar from "./FilterBar";
import KpiRow from "./KpiRow";
import ResultTable from "./ResultTable";
import { useTongHopData } from "./useTongHopData";

// Container -- chỉ lo state (qua useTongHopData) + ghép các khối UI
// (FilterBar/KpiRow/ResultTable) lại với nhau.
export default function TongHop() {
  const t = useTongHopData();
  const { error, exportError, retryLoad, filtered, exportingExcel, exportExcel } = t;

  return (
    <div>
      <PageHeader
        icon={<Table2 size={22} />}
        title="Tổng hợp kết quả"
        subtitle="So sánh điểm 5S giữa các khoa/phòng trong một đợt hoặc khoảng thời gian — xếp hạng và xuất báo cáo"
        actions={
          <button
            className={btnSecondary}
            onClick={exportExcel}
            disabled={!filtered.length || exportingExcel}
          >
            <Download size={15} />{" "}
            {exportingExcel ? "Đang xuất..." : "Xuất Excel"}
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={retryLoad} />}
      {exportError && <ErrorBanner message={exportError} />}

      {/* ── Bộ lọc ── */}
      <FilterBar t={t} />

      <KpiRow kpi={t.kpi} />

      <ResultTable t={t} />
    </div>
  );
}
