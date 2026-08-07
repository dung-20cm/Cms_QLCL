import { KpiCard } from "../../components/ui/PageShell";

interface Kpi {
  total: number;
  active: number;
  admin: number;
  chuaGan: number;
}

export default function KpiRow({ kpi }: { kpi: Kpi }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <KpiCard label="Tổng tài khoản" value={kpi.total} accent="navy" />
      <KpiCard label="Đang hoạt động" value={kpi.active} accent="green" />
      <KpiCard label="Quản trị viên" value={kpi.admin} accent="blue" />
      <KpiCard
        label="Chưa gán quyền"
        value={kpi.chuaGan}
        accent={kpi.chuaGan ? "yellow" : "navy"}
      />
    </div>
  );
}
