import { PartyPopper } from "lucide-react";
import { Modal } from "../../components/ui/PageShell";
import type { BangKiemData } from "./useBangKiemData";

// Modal cảm ơn sau khi lưu mới -- tự tắt sau 3s (xử lý ở hook) hoặc bấm x đóng sớm.
export default function SuccessModal({ bk }: { bk: BangKiemData }) {
  const { showSuccessModal, setShowSuccessModal, saved } = bk;

  return (
    <Modal
      open={showSuccessModal}
      title="Đã lưu kết quả"
      onClose={() => setShowSuccessModal(false)}
    >
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
          <PartyPopper size={28} />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Cảm ơn bạn đã hoàn thành đánh giá 5S!
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kết quả đã được ghi nhận vào hệ thống
            {saved ? (
              <>
                {" "}
                với tỷ lệ đạt{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {saved.pct}%
                </span>{" "}
                ({saved.xep_loai}). Bạn chỉ có thể sửa hoặc xoá đánh giá này
                trong ngày hôm nay. Rất cảm ơn sự tận tâm của bạn trong công
                tác giữ gìn 5S tại đơn vị!
              </>
            ) : (
              "."
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
}
