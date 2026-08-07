import { KpiCard } from "../../components/ui/PageShell";

interface KpiTodayData {
  today: number;
  ok: number;
  kp: number;
  month: number;
}

// Hàng 4 thẻ KPI đầu trang Báo cáo -- thuần hiển thị, không tự tính toán/gọi API.
export default function KpiRow({ kpiToday }: { kpiToday: KpiTodayData }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <KpiCard
        label="Hôm nay"
        value={kpiToday.today}
        sub="lượt đánh giá"
        accent="navy"
      />
      <KpiCard
        label="Đạt tốt hôm nay"
        value={kpiToday.ok}
        sub="≥ 85%"
        accent="green"
      />
      <KpiCard
        label="Cần KP hôm nay"
        value={kpiToday.kp}
        sub="có tiêu chí chưa đạt"
        accent="red"
      />
      <KpiCard
        label="Tổng tháng này"
        value={kpiToday.month}
        sub="lượt"
        accent="blue"
      />
    </div>
  );
}
