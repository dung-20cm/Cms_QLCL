import { KpiCard } from "../../components/ui/PageShell";

interface Anh5SKpi {
  luot: number;
  dat: number;
  khdat: number;
  total: number;
}

export default function KpiRow({ kpi }: { kpi: Anh5SKpi }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard label="📷 Lượt có ảnh" value={kpi.luot} accent="navy" />
      <KpiCard
        label="✅ Ảnh thuộc lượt Đạt (≥60%)"
        value={kpi.dat}
        accent="green"
      />
      <KpiCard
        label="❌ Ảnh thuộc lượt Chưa đạt"
        value={kpi.khdat}
        accent="red"
      />
      <KpiCard label="🖼 Tổng ảnh" value={kpi.total} accent="yellow" />
    </div>
  );
}
