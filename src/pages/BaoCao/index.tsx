import { useRef } from "react";
import { FileDown, Printer } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  EmptyState,
  ErrorBanner,
  LoadingRow,
  PageHeader,
} from "../../components/ui/PageShell";
import { REPORT_CSS } from "./constants";
import KpiRow from "./KpiRow";
import ReportFilters from "./ReportFilters";
import ReportTypeSelector from "./ReportTypeSelector";
import { exportWordDoc } from "./reportUtils";
import DonViReport from "./templates/DonViReport";
import DotReport from "./templates/DotReport";
import GuiKhoaReport from "./templates/GuiKhoaReport";
import LuotReport from "./templates/LuotReport";
import ThangReport from "./templates/ThangReport";
import { useBaoCaoData } from "./useBaoCaoData";

// Container -- chỉ lo state (qua useBaoCaoData) + gọi API xuất Word + ghép các
// mảnh UI (KpiRow/ReportTypeSelector/ReportFilters/template phiếu) lại với
// nhau. Không tự chứa logic tính toán/JSX chi tiết của từng loại phiếu.
export default function BaoCao() {
  const bc = useBaoCaoData();
  const {
    khoaList,
    loading,
    error,
    retryLoad,
    rptType,
    setRptType,
    selThang,
    effectiveSelKhoa,
    effectiveDvKhoa,
    dvFrom,
    dvTo,
    donViRows,
    canViewAllKhoa,
    selDotId,
    effectiveSelDotKhoa,
    dotDanhGiaAllList,
    dotRows,
    dotKPList,
    dotNhanXet,
    luot,
    luotKP,
    nhanXet,
    thangRows,
    gkRecs,
    kpByDanhGiaId,
    gkHanDays,
    kpiToday,
    showPreview,
  } = bc;

  const printAreaRef = useRef<HTMLDivElement>(null);

  function handleExportWord() {
    if (!printAreaRef.current) return;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix =
      rptType === "luot"
        ? "PhieuKetQua5S"
        : rptType === "thang"
          ? "BaoCaoThang5S"
          : rptType === "donvi"
            ? "BaoCaoDonVi5S"
            : rptType === "dot"
              ? "BaoCaoDotDanhGia5S"
              : "PhieuYeuCauKP5S";
    exportWordDoc(printAreaRef.current, `${prefix}_${stamp}.doc`);
  }

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; inset: 0; width: 100%; }
          @page { size: A4; margin: 0; }
        }
        ${REPORT_CSS}
      `}</style>

      <div className="print:hidden">
        <PageHeader
          icon={<Printer size={22} />}
          title="Báo cáo & in ấn"
          subtitle="Tạo phiếu báo cáo theo thể thức NĐ 30/2020/NĐ-CP — in trực tiếp, lưu PDF hoặc xuất file Word"
          actions={
            showPreview && (
              <>
                <button className={btnSecondary} onClick={handleExportWord}>
                  <FileDown size={15} /> Xuất file Word
                </button>
                <button className={btnPrimary} onClick={() => window.print()}>
                  <Printer size={15} /> In / Lưu PDF
                </button>
              </>
            )
          }
        />
        {error && <ErrorBanner message={error} onRetry={retryLoad} />}

        <KpiRow kpiToday={kpiToday} />

        {/* ── Chọn loại báo cáo ── */}
        <ReportTypeSelector rptType={rptType} setRptType={setRptType} />

        {/* ── Chọn dữ liệu ── */}
        <ReportFilters bc={bc} />

        {loading && <LoadingRow />}
        {!loading && !showPreview && (
          <EmptyState
            icon={<Printer size={36} />}
            message="Chọn dữ liệu ở trên để xem trước báo cáo"
          />
        )}
      </div>

      {/* ══ VÙNG XEM TRƯỚC + IN ══ */}
      {showPreview && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 print:rounded-none print:border-0 print:shadow-none">
          <div id="print-area" ref={printAreaRef}>
            {rptType === "guikhoa" ? (
              gkRecs.length > 0 && (
                <GuiKhoaReport
                  recs={gkRecs}
                  kpByDanhGiaId={kpByDanhGiaId}
                  hanDays={gkHanDays}
                />
              )
            ) : (
              <div className="pa-wrap">
                {rptType === "luot" && luot && (
                  <LuotReport luot={luot} kpList={luotKP} nhanXet={nhanXet} />
                )}
                {rptType === "thang" && (
                  <ThangReport
                    thang={selThang}
                    khoaLabel={
                      khoaList.find((k) => String(k.id) === effectiveSelKhoa)
                        ?.ten_khoa
                    }
                    rows={thangRows}
                    showNguon={canViewAllKhoa}
                  />
                )}
                {rptType === "donvi" && (
                  <DonViReport
                    khoaTen={
                      khoaList.find((k) => String(k.id) === effectiveDvKhoa)
                        ?.ten_khoa || ""
                    }
                    from={dvFrom}
                    to={dvTo}
                    rows={donViRows}
                    showNguon={canViewAllKhoa}
                  />
                )}
                {rptType === "dot" && (
                  <DotReport
                    dotTen={
                      dotDanhGiaAllList.find((d) => String(d.id) === selDotId)
                        ?.ten_dot || ""
                    }
                    khoaTen={
                      khoaList.find((k) => String(k.id) === effectiveSelDotKhoa)
                        ?.ten_khoa || ""
                    }
                    rows={dotRows}
                    kpList={dotKPList}
                    nhanXet={dotNhanXet}
                    showNguon={canViewAllKhoa}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
