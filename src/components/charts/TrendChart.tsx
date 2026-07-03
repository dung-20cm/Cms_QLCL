import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'

const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const series = [
  { name: 'Tỷ lệ đạt trung bình (%)', data: [72, 75, 78, 74, 81, 85, 88] },
  { name: 'Số khoa tham gia đánh giá', data: [40, 42, 45, 44, 47, 48, 49] },
]

const options: ApexOptions = {
  chart: {
    type: 'area',
    toolbar: { show: false },
    fontFamily: 'inherit',
  },
  colors: ['#465fff', '#7592ff'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: { opacityFrom: 0.35, opacityTo: 0 },
  },
  grid: { borderColor: '#f1f2f4' },
  xaxis: {
    categories: months,
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  legend: { position: 'top', horizontalAlign: 'left' },
  tooltip: { y: { formatter: (v) => `${v}` } },
}

export default function TrendChart() {
  return <Chart options={options} series={series} type="area" height={310} />
}
