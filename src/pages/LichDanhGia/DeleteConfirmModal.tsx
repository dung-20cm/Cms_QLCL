import { btnSecondary, Modal } from "../../components/ui/PageShell";
import { tenNguoi } from "./lichHelpers";
import type { LichDanhGiaData } from "./useLichDanhGiaData";

// Modal xác nhận xoá lịch (thay cho window.confirm — có thể bị trình duyệt
// chặn/ẩn ở 1 số môi trường, và không đồng bộ giao diện với phần còn lại của app)
export default function DeleteConfirmModal({ lg }: { lg: LichDanhGiaData }) {
  const {
    confirmDeleteGroup,
    setConfirmDeleteGroup,
    deletingGroup,
    deleteError,
    deleteLichGroup,
  } = lg;

  return (
    <Modal
      open={!!confirmDeleteGroup}
      title="Xoá lịch đánh giá"
      onClose={() => setConfirmDeleteGroup(null)}
      footer={
        <>
          <button
            className={btnSecondary}
            onClick={() => setConfirmDeleteGroup(null)}
            disabled={deletingGroup}
          >
            Huỷ
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            onClick={() =>
              confirmDeleteGroup && deleteLichGroup(confirmDeleteGroup)
            }
            disabled={deletingGroup}
          >
            {deletingGroup ? "Đang xoá..." : "Xoá lịch"}
          </button>
        </>
      }
    >
      {confirmDeleteGroup && (
        <div className="grid gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Bạn có chắc chắn muốn xoá lịch đánh giá này? Hành động này không
            thể hoàn tác.
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
            <p className="font-semibold text-gray-700 dark:text-gray-200">
              {confirmDeleteGroup.khoa?.ten_khoa}
            </p>
            {confirmDeleteGroup.vitri_type?.ten_vitri && (
              <p className="text-xs text-gray-400">
                {confirmDeleteGroup.vitri_type.ten_vitri}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Cán bộ phụ trách:{" "}
              {confirmDeleteGroup.items
                .map(tenNguoi)
                .filter(Boolean)
                .join(", ") || "—"}
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
