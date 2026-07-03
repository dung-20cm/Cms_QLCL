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
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50">
        <Icon size={20} className="text-brand-500" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-800">{value}</p>
        </div>
        <span
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(change)}%
        </span>
      </div>
    </div>
  )
}
