import { ClipboardList } from "lucide-react";
import { ErrorBanner, LoadingRow, PageHeader } from "../../components/ui/PageShell";
import ChecklistGroups from "./ChecklistGroups";
import ChecklistToolbar from "./ChecklistToolbar";
import DeleteConfirmModal from "./DeleteConfirmModal";
import InfoForm from "./InfoForm";
import LichWarningModal from "./LichWarningModal";
import ResultBanner from "./ResultBanner";
import SaveBar from "./SaveBar";
import SuccessModal from "./SuccessModal";
import { useBangKiemData } from "./useBangKiemData";

// Container -- chỉ lo state (qua useBangKiemData) + ghép các khối UI
// (InfoForm/ResultBanner/ChecklistToolbar/ChecklistGroups/SaveBar/3 modal)
// lại với nhau.
export default function BangKiem() {
  const bk = useBangKiemData();
  const { catalogStatus, catalogError, showChecklist } = bk;

  if (catalogStatus === "loading" || catalogStatus === "idle")
    return <LoadingRow />;

  return (
    <div>
      <PageHeader
        icon={<ClipboardList size={22} />}
        title="Bảng kiểm đánh giá 5S"
        subtitle="Chọn khoa + vị trí → chấm từng tiêu chí → lưu kết quả về máy chủ"
      />
      {catalogError && <ErrorBanner message={catalogError} />}

      {/* ── Thông tin đánh giá ── */}
      <InfoForm bk={bk} />

      <ResultBanner bk={bk} />

      {showChecklist && (
        <>
          <ChecklistToolbar bk={bk} />
          <ChecklistGroups bk={bk} />
          <SaveBar bk={bk} />
        </>
      )}

      <SuccessModal bk={bk} />
      <LichWarningModal bk={bk} />
      <DeleteConfirmModal bk={bk} />
    </div>
  );
}
