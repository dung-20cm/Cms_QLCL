import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  change: number
  icon: LucideIcon
}

export default function StatCard({ label, value, change, icon: Icon }: StatCardProps) {
  const positive = change >= 0

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
        <Icon size={20} className="text-brand-500 dark:text-brand-400" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
        <span
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            positive
              ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}
        >
          {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(change)}%
        </span>
      </div>
    </div>
  )
}
