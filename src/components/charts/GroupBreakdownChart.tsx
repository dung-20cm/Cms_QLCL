import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'

const groups = ['S1 - Sàng lọc', 'S2 - Sắp xếp', 'S3 - Sạch sẽ', 'S4 - Săn sóc', 'S5 - Sẵn sàng']

const series = [{ name: 'Tỷ lệ đạt (%)', data: [86, 82, 90, 78, 84] }]

const options: ApexOptions = {
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  plotOptions: {
    bar: { borderRadius: 6, columnWidth: '45%', distributed: true },
  },
  colors: ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
  legend: { show: false },
  dataLabels: { enabled: false },
  grid: { borderColor: '#f1f2f4' },
  xaxis: {
    categories: groups,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { fontSize: '11px' } },
  },
  yaxis: { max: 100 },
}

export default function GroupBreakdownChart() {
  return <Chart options={options} series={series} type="bar" height={310} />
}
