// Tóm tắt tỷ lệ tuân thủ theo từng cán bộ -- chỉ hiển thị khi không lọc riêng 1 người.
export interface ComplianceSummaryRow {
  name: string;
  total: number;
  done: number;
  miss: number;
  pct: number;
}

export default function ComplianceSummaryTable({
  rows,
}: {
  rows: ComplianceSummaryRow[];
}) {
  return (
    <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Tổng hợp theo cán bộ
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 dark:border-gray-700">
              <th className="px-3 py-2 font-medium">Cán bộ</th>
              <th className="px-3 py-2 text-center font-medium">Tổng</th>
              <th className="px-3 py-2 text-center font-medium">✅</th>
              <th className="px-3 py-2 text-center font-medium">❌</th>
              <th className="px-4 py-2 font-medium">Hoàn thành</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.name}
                className="border-b border-gray-50 last:border-0 dark:border-gray-800/50"
              >
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">
                  {s.name}
                </td>
                <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                  {s.total}
                </td>
                <td className="px-3 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                  {s.done}
                </td>
                <td className="px-3 py-2 text-center font-semibold text-red-600 dark:text-red-400">
                  {s.miss}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full ${
                          s.pct >= 80
                            ? "bg-emerald-500"
                            : s.pct >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <span
                      className={`min-w-[32px] text-xs font-bold ${
                        s.pct >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : s.pct >= 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {s.pct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
