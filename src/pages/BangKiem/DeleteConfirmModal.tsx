import { Trash2 } from "lucide-react";
import { btnDanger, btnSecondary, Modal } from "../../components/ui/PageShell";
import type { BangKiemData } from "./useBangKiemData";

export default function DeleteConfirmModal({ bk }: { bk: BangKiemData }) {
  const { confirmDeleteOpen, setConfirmDeleteOpen, deleting, handleDelete, foundRecord } =
    bk;

  return (
    <Modal
      open={confirmDeleteOpen}
      title="Xoá đánh giá"
      onClose={() => setConfirmDeleteOpen(false)}
      footer={
        <>
          <button
            className={btnSecondary}
            onClick={() => setConfirmDeleteOpen(false)}
          >
            Huỷ
          </button>
          <button className={btnDanger} disabled={deleting} onClick={handleDelete}>
            <Trash2 size={14} /> {deleting ? "Đang xoá..." : "Xoá đánh giá"}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Bạn chắc chắn muốn xoá đánh giá này ({foundRecord?.pct}% —{" "}
        {foundRecord?.xep_loai})? Hành động này không thể hoàn tác.
      </p>
    </Modal>
  );
}
