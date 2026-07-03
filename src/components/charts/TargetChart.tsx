import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'

const series = [88]

const options: ApexOptions = {
  chart: { type: 'radialBar', fontFamily: 'inherit' },
  colors: ['#465fff'],
  plotOptions: {
    radialBar: {
      hollow: { size: '65%' },
      track: { background: '#f1f2f4' },
      dataLabels: {
        value: {
          fontSize: '28px',
          fontWeight: 600,
          color: '#1d2939',
          formatter: (v) => `${v}%`,
        },
        name: { show: false },
      },
    },
  },
}

export default function TargetChart() {
  return <Chart options={options} series={series} type="radialBar" height={230} />
}
