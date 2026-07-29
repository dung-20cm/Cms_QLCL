import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { removeToast } from '../../features/ui/toastSlice'
import type { ToastItem } from '../../features/ui/toastSlice'

const AUTO_DISMISS_MS = 3000

function ToastCard({ item }: { item: ToastItem }) {
  const dispatch = useAppDispatch()

  // Tự tắt sau 3s -- người dùng vẫn bấm X đóng sớm hơn được nếu muốn.
  useEffect(() => {
    const timer = setTimeout(() => dispatch(removeToast(item.id)), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [item.id, dispatch])

  const isSuccess = item.type === 'success'

  return (
    <div
      className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-lg dark:bg-gray-900 ${
        isSuccess
          ? 'border-emerald-200 dark:border-emerald-500/30'
          : 'border-red-200 dark:border-red-500/30'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
      ) : (
        <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
      )}
      <p className="flex-1 text-sm leading-snug text-gray-700 dark:text-gray-200">
        {item.message}
      </p>
      <button
        onClick={() => dispatch(removeToast(item.id))}
        className="shrink-0 text-gray-300 transition hover:text-gray-500 dark:hover:text-gray-300"
      >
        <X size={15} />
      </button>
    </div>
  )
}

// Mount 1 lần ở AppLayout -- render qua portal thẳng vào document.body (tránh
// bị kẹt trong ancestor có transform, giống lý do Modal dùng portal).
export default function ToastContainer() {
  const items = useAppSelector((s) => s.toast.items)
  if (items.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  )
}
