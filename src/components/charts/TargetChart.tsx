import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useAppSelector } from '../../app/hooks'

interface TargetChartProps {
  value?: number
}

export default function TargetChart({ value = 0 }: TargetChartProps) {
  const series = [value]
  const mode = useAppSelector((s) => s.theme.mode)
  const isDark = mode === 'dark'

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'radialBar', fontFamily: 'inherit', background: 'transparent' },
      theme: { mode },
      colors: ['#465fff'],
      plotOptions: {
        radialBar: {
          hollow: { size: '65%' },
          track: { background: isDark ? '#1f2937' : '#f1f2f4' },
          dataLabels: {
            value: {
              fontSize: '28px',
              fontWeight: 600,
              color: isDark ? '#f3f4f6' : '#1d2939',
              formatter: (v) => `${v}%`,
            },
            name: { show: false },
          },
        },
      },
    }),
    [mode, isDark],
  )

  return <Chart options={options} series={series} type="radialBar" height={230} />
}
