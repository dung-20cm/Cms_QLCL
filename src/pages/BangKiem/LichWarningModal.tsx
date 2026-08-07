import { AlertTriangle } from "lucide-react";
import { btnPrimary, Modal } from "../../components/ui/PageShell";
import type { BangKiemData } from "./useBangKiemData";

// Modal báo lỗi khi điều kiện đang chọn KHÔNG khớp Lịch đánh giá -- mở khi
// người dùng cố chấm điểm trong lúc lichCheck.ok === false.
export default function LichWarningModal({ bk }: { bk: BangKiemData }) {
  const { lichModalOpen, setLichModalOpen, lichCheck } = bk;

  return (
    <Modal
      open={lichModalOpen}
      title="Chưa thể chấm điểm"
      onClose={() => setLichModalOpen(false)}
      footer={
        <button className={btnPrimary} onClick={() => setLichModalOpen(false)}>
          Đã hiểu
        </button>
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
          <AlertTriangle size={20} />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {lichCheck.message}
        </p>
      </div>
    </Modal>
  );
}
