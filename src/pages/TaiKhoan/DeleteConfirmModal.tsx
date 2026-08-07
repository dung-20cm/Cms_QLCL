import { Trash2 } from "lucide-react";
import { btnDanger, btnSecondary, Modal } from "../../components/ui/PageShell";
import type { TaiKhoanData } from "./useTaiKhoanData";

export default function DeleteConfirmModal({ t }: { t: TaiKhoanData }) {
  const { deleting, setDeleting, deleteBusy, handleDelete } = t;

  return (
    <Modal
      open={!!deleting}
      title="Xoá tài khoản"
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
            <Trash2 size={14} /> {deleteBusy ? "Đang xoá..." : "Xoá tài khoản"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Bạn chắc chắn muốn xoá tài khoản <b>{deleting?.username}</b>
        {deleting?.khoa?.ten_khoa ? ` (${deleting.khoa.ten_khoa})` : ""}? Tài
        khoản sẽ không thể đăng nhập sau khi xoá.
      </p>
    </Modal>
  );
}
