import { Camera, FileBarChart, Plus } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  EmptyState,
  ErrorBanner,
  LoadingRow,
  PageHeader,
} from "../../components/ui/PageShell";
import Pagination from "../../components/ui/Pagination";
import DeleteConfirmModal from "./DeleteConfirmModal";
import FilterBar from "./FilterBar";
import KpiRow from "./KpiRow";
import Lightbox from "./Lightbox";
import PhotoFormModal from "./PhotoFormModal";
import PhotoGroupList from "./PhotoGroupList";
import { useAnh5SData } from "./useAnh5SData";

// Container -- chỉ lo state (qua useAnh5SData) + ghép các khối UI
// (KpiRow/FilterBar/PhotoGroupList/Pagination/Lightbox/2 modal) lại với nhau.
export default function Anh5S() {
  const a = useAnh5SData();
  const {
    isViewOnly,
    error,
    load,
    exportError,
    exporting,
    groups,
    handleExportPpt,
    kpi,
    loading,
    page,
    setPage,
    totalPages,
    pageSize,
    totalItems,
    openAdd,
  } = a;

  return (
    <div>
      <PageHeader
        icon={<Camera size={22} />}
        title="Ảnh 5S — minh chứng đánh giá"
        subtitle="Ảnh chụp kèm khi đánh giá Bảng kiểm, hoặc gửi nhanh độc lập tại đây"
        actions={
          <div className="flex gap-2">
            <button
              className={btnSecondary}
              disabled={exporting || groups.length === 0}
              onClick={handleExportPpt}
              title="Xuất báo cáo PowerPoint"
            >
              <FileBarChart size={15} />{" "}
              {exporting ? "Đang xuất..." : "Xuất PPTX"}
            </button>
            {!isViewOnly && (
              <button className={btnPrimary} onClick={openAdd}>
                <Plus size={15} /> Thêm ảnh
              </button>
            )}
          </div>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {exportError && (
        <ErrorBanner message={exportError} onRetry={handleExportPpt} />
      )}

      <KpiRow kpi={kpi} />

      {/* -- Bo loc -- */}
      <FilterBar a={a} />

      {loading ? (
        <LoadingRow />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Camera size={36} />}
          message="Chưa có ảnh minh chứng — bấm 'Thêm ảnh' hoặc tải ảnh khi lưu Bảng kiểm"
        />
      ) : (
        <div>
          <PhotoGroupList a={a} />
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </div>
        </div>
      )}

      {/* -- Lightbox: truot qua lai nhieu anh cung 1 luot gui bang react-slick -- */}
      <Lightbox a={a} />

      {/* -- Modal them / sua anh -- */}
      <PhotoFormModal a={a} />

      {/* -- Modal canh bao xoa -- */}
      <DeleteConfirmModal a={a} />
    </div>
  );
}
