import { Check, X } from "lucide-react";
import { LoadingRow } from "../../components/ui/PageShell";
import type { BangKiemData } from "./useBangKiemData";

// Lưới 5 nhóm S -- mỗi nhóm liệt kê từng tiêu chí, chấm Đạt/Không đạt, ghi
// chú lỗi khi chưa đạt.
export default function ChecklistGroups({ bk }: { bk: BangKiemData }) {
  const { loadingItems, groups, ketQua, ghiChu, setGhiChu, guardedSetKetQua } =
    bk;

  return (
    <>
      {loadingItems && <LoadingRow text="Đang tải bảng kiểm..." />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groups.map((g) => {
          const done = g.items.filter(
            (it) => ketQua[it.id] !== undefined && ketQua[it.id] !== null,
          ).length;
          const pass = g.items.filter((it) => ketQua[it.id] === 1).length;
          return (
            <div
              key={g.s_id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: g.s_lt }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: g.s_color }}
                  >
                    {g.s_id}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: g.s_color }}
                  >
                    {g.s_name}
                  </span>
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {pass}/{g.items.length} đạt · {done}/{g.items.length} đã chấm
                </span>
              </div>
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {g.items.map((it) => {
                  const kq = ketQua[it.id];
                  return (
                    <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: g.s_color }}
                        >
                          {it.sub}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-gray-700 dark:text-gray-300">
                          {it.tc}
                        </p>
                        {kq === 0 && (
                          <input
                            className="mt-2 h-8 w-full rounded-lg border border-red-200 bg-red-50/50 px-2.5 text-xs text-gray-700 outline-none placeholder:text-red-300 focus:border-red-400 dark:border-red-500/30 dark:bg-red-500/5 dark:text-gray-200"
                            placeholder="Ghi chú lỗi (dùng cho khắc phục)..."
                            value={ghiChu[it.id] || ""}
                            onChange={(e) =>
                              setGhiChu((p) => ({
                                ...p,
                                [it.id]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5 pt-0.5">
                        <button
                          onClick={() =>
                            guardedSetKetQua(it.id, kq === 1 ? null : 1)
                          }
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            kq === 1
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                              : "border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-400 dark:border-gray-700"
                          }`}
                          title="Đạt"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() =>
                            guardedSetKetQua(it.id, kq === 0 ? null : 0)
                          }
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            kq === 0
                              ? "border-red-500 bg-red-500 text-white shadow-sm"
                              : "border-gray-200 text-gray-300 hover:border-red-300 hover:text-red-400 dark:border-gray-700"
                          }`}
                          title="Không đạt"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
