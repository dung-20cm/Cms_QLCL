import CountUp from '../ui/CountUp'

// Thứ tự + màu cố định 5 nhóm 5S — khớp bảng màu file mẫu 5S_Dashboard_BVTB_v4
// (cùng bảng màu đang dùng ở XuHuong.tsx/BaoCao.tsx/TienDoKP.tsx).
const S_META: Record<string, { name: string; color: string }> = {
  S1: { name: 'Sàng lọc', color: '#D85A30' },
  S2: { name: 'Sắp xếp', color: '#BA7517' },
  S3: { name: 'Sạch sẽ', color: '#1D9E75' },
  S4: { name: 'Săn sóc', color: '#185FA5' },
  S5: { name: 'Sẵn sàng', color: '#534AB7' },
}
const S_IDS = ['S1', 'S2', 'S3', 'S4', 'S5']

interface GroupBreakdownChartProps {
  data?: number[] // tỷ lệ đạt S1..S5
}

// Danh sách thanh ngang (thay cho biểu đồ cột dọc ApexCharts trước đây) --
// khớp kiểu hiển thị "nhãn trái · thanh giữa · % phải" đang dùng thống nhất
// ở các bảng xếp hạng khác trong Dashboard/Xu hướng.
export default function GroupBreakdownChart({ data = [0, 0, 0, 0, 0] }: GroupBreakdownChartProps) {
  return (
    <div className="space-y-4 py-1">
      {S_IDS.map((id, i) => {
        const meta = S_META[id]
        const pct = data[i] ?? 0
        return (
          <div key={id} className="flex items-center gap-3">
            <span
              className="w-28 shrink-0 text-sm font-semibold"
              style={{ color: meta.color }}
            >
              {id} {meta.name}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: meta.color }}
              />
            </div>
            <span className="w-11 shrink-0 text-right text-sm font-bold text-gray-700 dark:text-gray-200">
              <CountUp value={pct} suffix="%" />
            </span>
          </div>
        )
      })}
    </div>
  )
}
