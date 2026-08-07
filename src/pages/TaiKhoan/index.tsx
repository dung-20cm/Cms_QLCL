import { Plus, Users } from "lucide-react";
import { btnPrimary, ErrorBanner, PageHeader } from "../../components/ui/PageShell";
import DeleteConfirmModal from "./DeleteConfirmModal";
import FilterBar from "./FilterBar";
import KpiRow from "./KpiRow";
import { useTaiKhoanData } from "./useTaiKhoanData";
import UserFormModal from "./UserFormModal";
import UserTable from "./UserTable";

// Container -- chỉ lo state (qua useTaiKhoanData) + ghép các khối UI
// (KpiRow/FilterBar/UserTable/2 modal) lại với nhau.
export default function TaiKhoan() {
  const t = useTaiKhoanData();
  const { isViewOnly, error, load, kpi, openCreate } = t;

  return (
    <div>
      <PageHeader
        icon={<Users size={22} />}
        title="Quản lý tài khoản"
        subtitle="Tạo tài khoản, phân quyền và quản lý người dùng hệ thống 5S (theo sơ đồ phân quyền)"
        actions={
          !isViewOnly && (
            <button className={btnPrimary} onClick={openCreate}>
              <Plus size={15} /> Tạo tài khoản
            </button>
          )
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <KpiRow kpi={kpi} />

      <FilterBar t={t} />

      <UserTable t={t} />

      {/* ── Modal tạo / sửa ── */}
      <UserFormModal t={t} />

      {/* ── Confirm xoá ── */}
      <DeleteConfirmModal t={t} />
    </div>
  );
}
