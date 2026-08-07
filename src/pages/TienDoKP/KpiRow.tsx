import { KpiCard } from "../../components/ui/PageShell";

interface Kpi {
  total: number;
  done: number;
  doing: number;
  over: number;
  chuaKP: number;
}

export default function KpiRow({ kpi }: { kpi: Kpi }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
      <KpiCard
        label="Tổng hành động"
        value={kpi.total}
        sub="tuần đang xem"
        accent="navy"
      />
      <KpiCard label="Đã xong" value={kpi.done} accent="green" />
      <KpiCard label="Đang xử lý" value={kpi.doing} accent="blue" />
      <KpiCard
        label="⚠ Quá hạn"
        value={kpi.over}
        sub="cần xử lý ngay"
        accent="red"
      />
      <KpiCard
        label="⚠ Chưa KP ≥5 ngày LV"
        value={kpi.chuaKP}
        sub="cần xử lý ngay"
        accent="yellow"
      />
    </div>
  );
}
