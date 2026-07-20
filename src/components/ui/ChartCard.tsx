import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export default function ChartCard({ title, subtitle, action, children }: ChartCardProps) {
  return (
    <div className="animate-rise-in rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
