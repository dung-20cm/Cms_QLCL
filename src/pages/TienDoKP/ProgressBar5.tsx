import type { KhacPhuc } from "../../features/qlcl/types";
import { workDaysPassed } from "./helpers";

export default function ProgressBar5({ r }: { r: KhacPhuc }) {
  if (r.trang_thai === "Đã xong") {
    return (
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        ✓ Đã hoàn thành
      </span>
    );
  }
  const detected = r.ngay_phat_hien || r.createdAt?.slice(0, 10);
  if (!detected) return <span className="text-xs text-gray-300">—</span>;
  const passed = workDaysPassed(detected);
  const pct = Math.min(100, (passed / 5) * 100);
  const color = passed >= 5 ? "#E24B4A" : passed >= 3 ? "#BA7517" : "#1D9E75";
  const label =
    passed >= 5
      ? `Hết 5 ngày LV (${passed} ngày đã qua)`
      : `Còn ${5 - passed} ngày LV`;
  return (
    <div style={{ minWidth: 100 }}>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="mt-1 text-[11px]" style={{ color }}>
        {passed}/5 · {label}
      </p>
    </div>
  );
}
