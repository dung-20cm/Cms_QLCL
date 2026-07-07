import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useAppSelector } from '../../app/hooks'

const groups = ['S1 - Sàng lọc', 'S2 - Sắp xếp', 'S3 - Sạch sẽ', 'S4 - Săn sóc', 'S5 - Sẵn sàng']

interface GroupBreakdownChartProps {
  data?: number[] // tỷ lệ đạt S1..S5
}

export default function GroupBreakdownChart({ data = [0, 0, 0, 0, 0] }: GroupBreakdownChartProps) {
  const series = [{ name: 'Tỷ lệ đạt (%)', data }]
  const mode = useAppSelector((s) => s.theme.mode)
  const isDark = mode === 'dark'

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
      theme: { mode },
      plotOptions: {
        bar: { borderRadius: 6, columnWidth: '45%', distributed: true },
      },
      colors: ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
      legend: { show: false },
      dataLabels: { enabled: false },
      grid: { borderColor: isDark ? '#1f2937' : '#f1f2f4' },
      xaxis: {
        categories: groups,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: '11px', colors: isDark ? '#9ca3af' : '#6b7280' } },
      },
      yaxis: { max: 100, labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } } },
      tooltip: { theme: mode },
    }),
    [mode, isDark],
  )

  return <Chart options={options} series={series} type="bar" height={310} />
}
