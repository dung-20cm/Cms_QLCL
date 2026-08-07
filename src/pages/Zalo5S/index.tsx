import { Download, FileText, ImageIcon, Plus, Printer } from "lucide-react";
import { btnPrimary, btnSecondary, ErrorBanner, PageHeader } from "../../components/ui/PageShell";
import FilterBar from "./FilterBar";
import KpiRow from "./KpiRow";
import RecordFormModal from "./RecordFormModal";
import { useZalo5SData } from "./useZalo5SData";
import WeekTable from "./WeekTable";

// Container -- chỉ lo state (qua useZalo5SData) + ghép các khối UI
// (KpiRow/FilterBar/WeekTable/modal ghi nhận) lại với nhau.
export default function Zalo5S() {
  const z = useZalo5SData();
  const {
    isViewOnly,
    error,
    load,
    exportingExcel,
    exportExcel,
    exporting,
    exportBaoCao,
    openModal,
    kpi,
    khoaList,
  } = z;

  return (
    <div>
      <PageHeader
        icon={<ImageIcon size={22} />}
        title="Nhóm Zalo 5S — Theo dõi gửi ảnh"
        subtitle="Ghi nhận khoa nào đã gửi ảnh lên nhóm Zalo 5S mỗi tuần — số lượng, vị trí, chất lượng"
        actions={
          <>
            <button
              className={btnSecondary}
              onClick={exportExcel}
              disabled={exportingExcel}
            >
              <Download size={15} />{" "}
              {exportingExcel ? "Đang xuất..." : "Xuất Excel"}
            </button>
            <button
              className={btnSecondary}
              onClick={() => exportBaoCao("html")}
              disabled={exporting !== null}
              title="Tải file HTML báo cáo — mở lên bấm nút '🖨 In / Lưu PDF' để in ra PDF"
            >
              <Printer size={15} />{" "}
              {exporting === "html" ? "Đang xuất..." : "Báo cáo HTML/PDF"}
            </button>
            <button
              className={btnSecondary}
              onClick={() => exportBaoCao("word")}
              disabled={exporting !== null}
              title="Tải file Word (.doc) báo cáo theo thể thức NĐ 30/2020/NĐ-CP"
            >
              <FileText size={15} />{" "}
              {exporting === "word" ? "Đang xuất..." : "Xuất Word"}
            </button>
            {!isViewOnly && (
              <button className={btnPrimary} onClick={() => openModal()}>
                <Plus size={16} /> Ghi nhận ảnh
              </button>
            )}
          </>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <KpiRow kpi={kpi} totalKhoa={khoaList.length} />

      {/* ── Bộ lọc ── */}
      <FilterBar z={z} />

      <WeekTable z={z} />

      {/* ── Modal ghi nhận ── */}
      <RecordFormModal z={z} />
    </div>
  );
}
