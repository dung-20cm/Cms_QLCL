import { ClipboardCheck, Percent, Building2, Wrench } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import ChartCard from '../components/ui/ChartCard'
import TrendChart from '../components/charts/TrendChart'
import GroupBreakdownChart from '../components/charts/GroupBreakdownChart'
import TargetChart from '../components/charts/TargetChart'

const stats = [
  { label: 'Tổng lượt đánh giá', value: '1,248', change: 8.2, icon: ClipboardCheck },
  { label: 'Tỷ lệ đạt trung bình', value: '84.6%', change: 3.1, icon: Percent },
  { label: 'Khoa/Phòng đạt Xuất sắc', value: '31 / 49', change: 5.4, icon: Building2 },
  { label: 'Hành động khắc phục đang mở', value: '17', change: -12.5, icon: Wrench },
]

const recentEvaluations = [
  { khoa: 'Khoa Nội tổng hợp', vitri: 'Buồng bệnh', pct: 92, xeploai: 'Xuất sắc' },
  { khoa: 'Khoa Ngoại chấn thương', vitri: 'Phòng mổ', pct: 78, xeploai: 'Khá' },
  { khoa: 'Khoa Xét nghiệm', vitri: 'Hành lang', pct: 65, xeploai: 'Trung bình' },
  { khoa: 'Khoa Sản', vitri: 'Buồng bệnh', pct: 88, xeploai: 'Tốt' },
  { khoa: 'Phòng Hành chính', vitri: 'Văn phòng', pct: 95, xeploai: 'Xuất sắc' },
]

const badgeClass: Record<string, string> = {
  'Xuất sắc': 'bg-green-50 text-green-700',
  'Tốt': 'bg-blue-50 text-blue-700',
  'Khá': 'bg-yellow-50 text-yellow-700',
  'Trung bình': 'bg-orange-50 text-orange-700',
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Analytics — Tổng quan chất lượng 5S</h1>
        <p className="mt-1 text-sm text-gray-500">
          Số liệu tổng hợp toàn viện, cập nhật theo đợt đánh giá gần nhất.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Xu hướng đánh giá theo tháng" subtitle="7 tháng gần nhất">
            <TrendChart />
          </ChartCard>
        </div>
        <ChartCard title="Mục tiêu tỷ lệ đạt" subtitle="Toàn viện — đợt hiện tại">
          <TargetChart />
          <p className="mt-2 text-center text-sm text-gray-500">
            Mục tiêu 90% · Hiện tại 88%
          </p>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Kết quả gần đây" subtitle="5 lượt đánh giá mới nhất">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-400">
                    <th className="pb-3 pr-4 font-medium">Khoa/Phòng</th>
                    <th className="pb-3 pr-4 font-medium">Vị trí</th>
                    <th className="pb-3 pr-4 font-medium">% Đạt</th>
                    <th className="pb-3 font-medium">Xếp loại</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvaluations.map((r) => (
                    <tr key={r.khoa} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-700">{r.khoa}</td>
                      <td className="py-3 pr-4 text-gray-500">{r.vitri}</td>
                      <td className="py-3 pr-4 text-gray-500">{r.pct}%</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClass[r.xeploai]}`}
                        >
                          {r.xeploai}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
        <ChartCard title="Tỷ lệ đạt theo nhóm 5S" subtitle="S1 → S5">
          <GroupBreakdownChart />
        </ChartCard>
      </div>
    </div>
  )
}
