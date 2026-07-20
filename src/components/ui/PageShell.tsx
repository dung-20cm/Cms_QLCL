import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { loadCatalog } from '../../features/qlcl/catalogSlice'
import { loadDanhGia } from '../../features/qlcl/danhGiaSlice'
import { loadKhacPhuc } from '../../features/qlcl/khacPhucSlice'
import { loadTodayLich } from '../../features/qlcl/todayLichSlice'
import { fmt } from '../../features/qlcl/lichUtils'

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: 'navy' | 'green' | 'red' | 'yellow' | 'blue'
  delay?: number
}

const accentBar: Record<NonNullable<KpiCardProps['accent']>, string> = {
  navy: 'before:bg-brand-500',
  green: 'before:bg-emerald-500',
  red: 'before:bg-red-500',
  yellow: 'before:bg-amber-500',
  blue: 'before:bg-sky-500',
}

const accentText: Record<NonNullable<KpiCardProps['accent']>, string> = {
  navy: 'text-gray-800 dark:text-gray-100',
  green: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  blue: 'text-sky-600 dark:text-sky-400',
}

export function KpiCard({ label, value, sub, accent = 'navy', delay = 0 }: KpiCardProps) {
  return (
    <div
      className={`animate-rise-in relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md before:absolute before:inset-y-0 before:left-0 before:w-1 dark:border-gray-800 dark:bg-gray-900 ${accentBar[accent]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accentText[accent]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}

export function EmptyState({ icon, message }: { icon?: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
      {icon && <div className="text-gray-300 dark:text-gray-600">{icon}</div>}
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
    </div>
  )
}

export function LoadingRow({ text = 'Đang tải dữ liệu...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
      {text}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <span>⚠ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-500/40 dark:hover:bg-red-500/20"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

// Field + label chuẩn cho filter bar / form
export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:ring-brand-500/20'

export const btnPrimary =
  'inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-brand-600 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

export const btnSecondary =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-600 transition duration-150 hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'

export const btnDanger =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 text-sm font-medium text-red-600 transition duration-150 hover:bg-red-100 active:scale-95 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'

// Modal đơn giản dùng chung
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`animate-scale-in flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Hook nạp danh mục dùng chung (chỉ gọi API lần đầu)
export function useCatalog() {
  const dispatch = useAppDispatch()
  const catalog = useAppSelector((s) => s.catalog)
  useEffect(() => {
    if (catalog.status === 'idle') dispatch(loadCatalog())
  }, [catalog.status, dispatch])
  return catalog
}

// Toàn bộ danh sách đánh giá — cache dùng chung nhiều trang (xem danhGiaSlice.ts),
// chỉ gọi API khi status còn 'idle' (lần đầu cần tới, hoặc sau khi bị invalidate).
export function useDanhGia() {
  const dispatch = useAppDispatch()
  const danhGia = useAppSelector((s) => s.danhGia)
  useEffect(() => {
    if (danhGia.status === 'idle') dispatch(loadDanhGia())
  }, [danhGia.status, dispatch])
  return danhGia
}

// Toàn bộ danh sách khắc phục — cache dùng chung (xem khacPhucSlice.ts).
export function useKhacPhuc() {
  const dispatch = useAppDispatch()
  const khacPhuc = useAppSelector((s) => s.khacPhuc)
  useEffect(() => {
    if (khacPhuc.status === 'idle') dispatch(loadKhacPhuc())
  }, [khacPhuc.status, dispatch])
  return khacPhuc
}

// Lịch phân công của đúng hôm nay — cache dùng chung giữa banner "Lịch hôm
// nay" và trang Thống kê (xem todayLichSlice.ts). Tự phát hiện lệch ngày
// (app mở qua nửa đêm) để fetch lại.
export function useTodayLich() {
  const dispatch = useAppDispatch()
  const todayLich = useAppSelector((s) => s.todayLich)
  const todayStr = fmt(new Date())
  useEffect(() => {
    if (todayLich.status === 'idle' || (todayLich.status === 'succeeded' && todayLich.dateFetched !== todayStr)) {
      dispatch(loadTodayLich())
    }
  }, [todayLich.status, todayLich.dateFetched, todayStr, dispatch])
  return todayLich
}
