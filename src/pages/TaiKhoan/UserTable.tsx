import { Pencil, Trash2, Users } from "lucide-react";
import { EmptyState, LoadingRow } from "../../components/ui/PageShell";
import Pagination from "../../components/ui/Pagination";
import { roleBadge } from "./constants";
import type { TaiKhoanData } from "./useTaiKhoanData";

export default function UserTable({ t }: { t: TaiKhoanData }) {
  const {
    loading,
    filtered,
    pagedRows,
    currentUser,
    page,
    pageSize,
    isViewOnly,
    openEdit,
    setDeleting,
    totalPages,
    setPage,
    totalItems,
  } = t;

  if (loading) return <LoadingRow text="Đang tải danh sách tài khoản..." />;
  if (filtered.length === 0)
    return (
      <EmptyState
        icon={<Users size={28} />}
        message="Không có tài khoản nào khớp bộ lọc."
      />
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Tài khoản</th>
              <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
              <th className="px-4 py-3 font-medium">Quyền</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-right font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((u, i) => {
              const role = u.user_role?.role;
              const isSelf = u.id === currentUser?.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-gray-400">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {u.username}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] font-normal text-brand-500">
                          (bạn)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{u.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {u.khoa?.ten_khoa || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {role ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge[role.slug] || roleBadge["nhan-vien"]}`}
                      >
                        {role.name}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500">
                        Chưa gán quyền
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        u.status === 1
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${u.status === 1 ? "bg-emerald-500" : "bg-gray-300"}`}
                      />
                      {u.status === 1 ? "Hoạt động" : "Đã khoá"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isViewOnly && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                          title="Sửa / phân quyền"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                          title={
                            isSelf
                              ? "Không thể tự xoá tài khoản đang đăng nhập"
                              : "Xoá tài khoản"
                          }
                          disabled={isSelf}
                          onClick={() => setDeleting(u)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />
    </div>
  );
}
