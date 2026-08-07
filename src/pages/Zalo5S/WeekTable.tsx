import { LoadingRow } from "../../components/ui/PageShell";
import { clBadge } from "./helpers";
import type { Zalo5SData } from "./useZalo5SData";

export default function WeekTable({ z }: { z: Zalo5SData }) {
  const { loading, activeTuan, displayedKhoaList, weekMap, isViewOnly, openModal } =
    z;

  if (loading) return <LoadingRow />;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          Bảng theo dõi tuần {new Date(activeTuan).toLocaleDateString("vi-VN")}{" "}
          — {displayedKhoaList.length} khoa/phòng phù hợp
        </h3>
      </div>
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white dark:bg-gray-900">
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Khoa / Phòng / TT</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Số ảnh</th>
              <th className="px-4 py-3 font-medium">Vị trí đã gửi</th>
              <th className="px-4 py-3 font-medium">Chất lượng</th>
              <th className="px-4 py-3 font-medium">Ghi chú</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {displayedKhoaList.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-sm text-gray-400"
                >
                  Không có khoa/phòng phù hợp với bộ lọc.
                </td>
              </tr>
            )}
            {displayedKhoaList.map((k, idx) => {
              const r = weekMap.get(k.id);
              return (
                <tr
                  key={k.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <td className="px-5 py-2.5 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-200">
                    {k.ten_khoa}
                  </td>
                  <td className="px-4 py-2.5">
                    {r ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        ✓ Đã gửi
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500 dark:bg-red-500/10 dark:text-red-400">
                        Chưa gửi
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                    {r ? (
                      <span
                        className={
                          r.so_luong_anh >= 3 ? "" : "font-medium text-amber-600"
                        }
                      >
                        {r.so_luong_anh}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[260px] px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r?.vi_tri?.map((v) => (
                        <span
                          key={v.id}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        >
                          {v.vitri_type?.ten_vitri?.replace(/^\d+\.\s*/, "")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {r && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${clBadge(r.chat_luong)}`}
                      >
                        {r.chat_luong}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5 text-xs text-gray-400">
                    {r?.ghi_chu}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!isViewOnly && (
                      <button
                        onClick={() => openModal(k.id, r)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
                      >
                        {r ? "Sửa" : "Ghi nhận"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
