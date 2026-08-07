import CountUp from "../../components/ui/CountUp";
import { KpiCard } from "../../components/ui/PageShell";

interface Kpi {
  n: number;
  hasData: boolean;
  okPct: number;
  avg: number;
  best: string;
  bestAvg: number;
}

export default function KpiRow({ kpi }: { kpi: Kpi }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        label="Tổng lượt đánh giá"
        value={<CountUp value={kpi.n} />}
        sub="lượt"
        accent="navy"
        delay={0}
      />
      <KpiCard
        label="Đạt tốt (≥85%)"
        value={kpi.hasData ? <CountUp value={kpi.okPct} suffix="%" /> : "–"}
        sub="tỷ lệ"
        accent="green"
        delay={70}
      />
      <KpiCard
        label="Tỷ lệ đạt trung bình"
        value={kpi.hasData ? <CountUp value={kpi.avg} suffix="%" /> : "–"}
        accent="blue"
        delay={140}
      />
      <KpiCard
        label="Đơn vị tốt nhất"
        value={<span className="text-base">{kpi.best}</span>}
        sub={kpi.hasData ? `TB ${kpi.bestAvg}%` : ""}
        accent="yellow"
        delay={210}
      />
    </div>
  );
}
