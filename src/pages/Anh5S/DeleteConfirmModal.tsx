import { AlertTriangle, Trash2 } from "lucide-react";
import {
  btnDanger,
  btnSecondary,
  ErrorBanner,
  Modal,
} from "../../components/ui/PageShell";
import type { Anh5SData } from "./useAnh5SData";

export default function DeleteConfirmModal({ a }: { a: Anh5SData }) {
  const { deleting, setDeleting, deleteBusy, deleteError, handleDelete } = a;

  return (
    <Modal
      open={!!deleting}
      title="Xoá ảnh — cần xác nhận"
      onClose={() => setDeleting(null)}
      footer={
        <>
          <button className={btnSecondary} onClick={() => setDeleting(null)}>
            Huỷ
          </button>
          <button
            className={btnDanger}
            disabled={deleteBusy}
            onClick={handleDelete}
          >
            <Trash2 size={14} /> {deleteBusy ? "Đang xoá..." : "Tôi chắc chắn, xoá"}
          </button>
        </>
      }
    >
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Bạn sắp xoá <b>{deleting?.label}</b>. Ảnh minh chứng đã xoá sẽ không
          còn hiển thị trong báo cáo/thư viện ảnh 5S. Bạn có chắc chắn muốn
          xoá?
        </p>
      </div>
      {deleteError && (
        <div className="mt-3">
          <ErrorBanner message={deleteError} />
        </div>
      )}
    </Modal>
  );
}
