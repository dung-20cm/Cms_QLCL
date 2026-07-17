import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { inputCls } from './PageShell'
import { normalizeVn } from './searchNormalize'

export interface SearchableSelectOption<T extends string | number> {
  value: T
  label: string
}

interface SearchableSelectProps<T extends string | number> {
  value: T | ''
  onChange: (value: T | '') => void
  options: SearchableSelectOption<T>[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Select có gõ để lọc (combobox) — thay cho <select> thường ở các danh sách dài
// (khoa/phòng...): gõ ký tự tới đâu, danh sách lọc tới đó; hỗ trợ điều hướng bằng
// bàn phím (↑/↓/Enter/Esc) và nút xoá lựa chọn nhanh.
export default function SearchableSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = '— Chọn —',
  className = '',
  disabled = false,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value) || null

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const filtered = useMemo(() => {
    const q = normalizeVn(query)
    if (!q) return options
    return options.filter((o) => normalizeVn(o.label).includes(q))
  }, [options, query])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  function selectOption(opt: SearchableSelectOption<T> | null) {
    onChange(opt ? opt.value : '')
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlight]) selectOption(filtered[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const displayValue = open ? query : selected?.label ?? ''

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <input
          className={`${inputCls} w-full pr-14 ${className}`}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
          {selected && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="flex h-6 w-6 items-center justify-center rounded text-gray-300 transition hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
              title="Bỏ chọn"
              onMouseDown={(e) => {
                e.preventDefault()
                selectOption(null)
              }}
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown size={14} className="pointer-events-none text-gray-300" />
        </div>
      </div>

      {open && !disabled && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400">Không tìm thấy kết quả phù hợp</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={String(opt.value)}
                className={`cursor-pointer px-3 py-2 ${
                  i === highlight
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'text-gray-700 dark:text-gray-200'
                } ${opt.value === value ? 'font-medium' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(opt)
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
