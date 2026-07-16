import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Phân trang phía client cho các bảng danh sách (Tài khoản, Tiến độ khắc phục,
// Tổng hợp...) — mặc định 10 dòng/trang. `resetKey` (thường là chuỗi hoá các
// tiêu chí lọc đang áp dụng) để tự về trang 1 khi người dùng đổi bộ lọc, tránh
// tình trạng đang ở trang 3 rồi lọc ra danh sách khác hẳn.
export function usePagination<T>(
  items: T[],
  opts?: { pageSize?: number; resetKey?: unknown },
) {
  const pageSize = opts?.pageSize ?? 10
  const [page, setPage] = useState(1)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), [opts?.resetKey])

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  return { page, setPage, totalPages, pageItems, pageSize, totalItems: items.length }
}

function pageNumbers(page: number, totalPages: number): (number | '...')[] {
  const delta = 1
  const range: (number | '...')[] = []
  const left = Math.max(2, page - delta)
  const right = Math.min(totalPages - 1, page + delta)
  range.push(1)
  if (left > 2) range.push('...')
  for (let i = left; i <= right; i++) range.push(i)
  if (right < totalPages - 1) range.push('...')
  if (totalPages > 1) range.push(totalPages)
  return range
}

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  totalItems: number
  pageSize: number
}

export default function Pagination({
  page,
  totalPages,
  onChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
      <p className="text-xs text-gray-400">
        Hiển thị {from}–{to} / {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-300">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition ${
                p === page
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
