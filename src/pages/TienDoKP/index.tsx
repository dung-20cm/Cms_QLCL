import { Plus, Wrench } from "lucide-react";
import { btnPrimary, ErrorBanner, PageHeader } from "../../components/ui/PageShell";
import DeleteConfirmModal from "./DeleteConfirmModal";
import FilterBar from "./FilterBar";
import KhacPhucTable from "./KhacPhucTable";
import KpFormModal from "./KpFormModal";
import KpiRow from "./KpiRow";
import { useTienDoKPData } from "./useTienDoKPData";

// Container -- chỉ lo state (qua useTienDoKPData) + ghép các khối UI
// (KpiRow/FilterBar/KhacPhucTable/2 modal) lại với nhau.
export default function TienDoKP() {
  const t = useTienDoKPData();
  const { isViewOnly, error, load, kpi, openAdd } = t;

  return (
    <div>
      <PageHeader
        icon={<Wrench size={22} />}
        title="Theo dõi tiến độ khắc phục"
        subtitle="Tổng hợp lỗi phát hiện qua đánh giá — cập nhật tiến độ khắc phục hàng tuần"
        actions={
          !isViewOnly && (
            <button className={btnPrimary} onClick={openAdd}>
              <Plus size={15} /> Thêm hành động KP
            </button>
          )
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <KpiRow kpi={kpi} />

      {/* ── Điều hướng tuần + bộ lọc ── */}
      <FilterBar t={t} />

      <KhacPhucTable t={t} />

      {/* ── Modal Thêm / Sửa hành động khắc phục ── */}
      <KpFormModal t={t} />

      {/* ── Modal xác nhận xoá ── */}
      <DeleteConfirmModal t={t} />
    </div>
  );
}
