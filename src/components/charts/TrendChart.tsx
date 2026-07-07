import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useAppSelector } from '../../app/hooks'

interface TrendChartProps {
  categories?: string[]
  series?: { name: string; data: number[] }[]
}

const defaultMonths = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const defaultSeries = [
  { name: 'Tỷ lệ đạt trung bình (%)', data: [0, 0, 0, 0, 0, 0, 0] },
  { name: 'Số khoa tham gia đánh giá', data: [0, 0, 0, 0, 0, 0, 0] },
]

export default function TrendChart({ categories = defaultMonths, series = defaultSeries }: TrendChartProps) {
  const mode = useAppSelector((s) => s.theme.mode)
  const isDark = mode === 'dark'

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent',
      },
      theme: { mode },
      colors: ['#465fff', '#7592ff'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: { opacityFrom: 0.35, opacityTo: 0 },
      },
      grid: { borderColor: isDark ? '#1f2937' : '#f1f2f4' },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } },
      },
      yaxis: { labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } } },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: { colors: isDark ? '#d1d5db' : '#374151' },
      },
      tooltip: { theme: mode, y: { formatter: (v) => `${v}` } },
    }),
    [mode, isDark, categories],
  )

  return <Chart options={options} series={series} type="area" height={310} />
}
