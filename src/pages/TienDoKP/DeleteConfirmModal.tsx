import { btnSecondary, Modal } from "../../components/ui/PageShell";
import type { TienDoKPData } from "./useTienDoKPData";

export default function DeleteConfirmModal({ t }: { t: TienDoKPData }) {
  const { confirmDelete, setConfirmDelete, deleting, doDelete, deleteError } =
    t;

  return (
    <Modal
      open={!!confirmDelete}
      title="Xoá hành động khắc phục"
      onClose={() => setConfirmDelete(null)}
      footer={
        <>
          <button
            className={btnSecondary}
            onClick={() => setConfirmDelete(null)}
            disabled={deleting}
          >
            Huỷ
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            onClick={doDelete}
            disabled={deleting}
          >
            {deleting ? "Đang xoá..." : "Xoá hành động"}
          </button>
        </>
      }
    >
      {confirmDelete && (
        <div className="grid gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Bạn có chắc chắn muốn xoá hành động khắc phục này? Hành động này
            không thể hoàn tác.
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
            <p className="font-medium text-gray-700 dark:text-gray-200">
              {confirmDelete.khoa?.ten_khoa} ·{" "}
              {confirmDelete.vitri_type?.ten_vitri}
            </p>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {confirmDelete.hanh_dong_khac_phuc ||
                confirmDelete.danh_gia_chi_tiet?.checklist_item?.tc ||
                confirmDelete.mo_ta_loi}
            </p>
          </div>
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              ✗ {deleteError}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
