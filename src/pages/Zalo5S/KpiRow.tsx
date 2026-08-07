import { KpiCard } from "../../components/ui/PageShell";

interface Kpi {
  daGui: number;
  duSoLuong: number;
  chuaGui: number;
  tot: number;
}

export default function KpiRow({
  kpi,
  totalKhoa,
}: {
  kpi: Kpi;
  totalKhoa: number;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        label="📤 Đã gửi ảnh"
        value={`${kpi.daGui}/${totalKhoa}`}
        accent="navy"
      />
      <KpiCard
        label="✅ Đủ số lượng (≥3 ảnh)"
        value={kpi.duSoLuong}
        accent="green"
      />
      <KpiCard label="⏳ Chưa gửi" value={kpi.chuaGui} accent="red" />
      <KpiCard label="🏆 Chất lượng tốt" value={kpi.tot} accent="yellow" />
    </div>
  );
}
