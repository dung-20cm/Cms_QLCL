import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { inputCls } from './PageShell'
import { normalizeVn } from './searchNormalize'

export interface MultiSelectOption<T extends string | number> {
  value: T
  label: string
}

interface MultiSelectProps<T extends string | number> {
  values: T[]
  onChange: (values: T[]) => void
  options: MultiSelectOption<T>[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  // Các giá trị luôn ở trạng thái đã chọn, không cho bỏ tick/xoá (VD: chính người
  // đang đăng nhập luôn là 1 người đánh giá, không thể tự bỏ mình ra).
  lockedValues?: T[]
}

// Dropdown chọn nhiều — bấm mở danh sách, tick chọn (✓) từng dòng, gõ để lọc
// khi danh sách dài. Thay cho dãy nút pill trải dài gây rối mắt khi khoa/phòng
// có nhiều nhân sự.
export default function MultiSelect<T extends string | number>({
  values,
  onChange,
  options,
  placeholder = '— Chọn —',
  emptyText = 'Không có lựa chọn nào phù hợp',
  disabled = false,
  className = '',
  lockedValues = [],
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = normalizeVn(query)
    if (!q) return options
    return options.filter((o) => normalizeVn(o.label).includes(q))
  }, [options, query])

  function toggle(v: T) {
    if (lockedValues.includes(v)) return
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  }

  const selected = options.filter((o) => values.includes(o.value))

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      {/*
        Cố tình dùng <div role="button"> thay vì <button> thật: Field (PageShell.tsx)
        bọc component này trong <label>. Nếu trigger là <button> — phần tử "labelable"
        đầu tiên trong <label> — thì MỌI click vào bên trong label (kể cả trên các <li>
        tick chọn ở dropdown bên dưới) sẽ khiến trình duyệt tự "forward" thêm 1 click ảo
        tới đúng <button> này ngay sau đó, làm dropdown vừa tick chọn xong lại tự đóng
        (bug thực tế đã gặp khi test). <div> không phải phần tử labelable nên không bị
        forward click, tránh toàn bộ lớp lỗi này thay vì phải preventDefault từng chỗ.
      */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        className={`${inputCls} flex w-full cursor-pointer items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <span className={`truncate ${selected.length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
          {selected.length === 0 ? placeholder : `${selected.length} người đã chọn`}
        </span>
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && !disabled && (
        <div className="animate-dropdown-in absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {options.length > 6 && (
            <div className="border-b border-gray-100 p-1.5 dark:border-gray-700">
              <input
                autoFocus
                className={`${inputCls} h-8 w-full`}
                placeholder="Gõ để tìm..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400">{emptyText}</li>
            ) : (
              filtered.map((opt) => {
                const checked = values.includes(opt.value)
                const locked = lockedValues.includes(opt.value)
                return (
                  <li
                    key={String(opt.value)}
                    onClick={() => toggle(opt.value)}
                    className={`flex items-center gap-2.5 px-3 py-2 ${
                      locked
                        ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                        : 'cursor-pointer text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        checked
                          ? locked
                            ? 'border-gray-300 bg-gray-300 text-white dark:border-gray-600 dark:bg-gray-600'
                            : 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {checked && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="truncate">
                      {opt.label}
                      {locked && <span className="ml-1 opacity-70">(bạn)</span>}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}

      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {selected.map((opt) => {
            const locked = lockedValues.includes(opt.value)
            return (
              <span
                key={String(opt.value)}
                className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 text-xs font-medium ${
                  locked
                    ? 'border-brand-500 bg-brand-500 pr-2.5 text-white'
                    : 'border-brand-200 bg-brand-50 pr-1 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                }`}
              >
                {opt.label}
                {locked ? (
                  <span className="font-normal opacity-80">(bạn)</span>
                ) : (
                  // div[role=button], không phải <button> — lý do xem chú thích ở trigger phía trên
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggle(opt.value)
                      }
                    }}
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-brand-400 transition hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/20"
                  >
                    <X size={11} />
                  </div>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
