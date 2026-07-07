import { useCallback, useEffect, useMemo, useState } from 'react'
import { Table2, Download, RotateCcw } from 'lucide-react'
import {
  PageHeader,
  KpiCard,
  Field,
  inputCls,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
} from '../components/ui/PageShell'
import { fetchDanhGiaList } from '../features/qlcl/api'
import type { DanhGia } from '../features/qlcl/types'
import { toneBadgeClass, toneFromPct } from '../features/qlcl/types'

type SortKey = 'newest' | 'oldest' | 'rank_desc' | 'rank_asc' | 'khoa'

export default function TongHop() {
  const { khoaList, vitriTypes } = useCatalog()
  const [rows, setRows] = useState<DanhGia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fKhoa, setFKhoa] = useState('')
  const [fVitri, setFVitri] = useState('')
  const [fDot, setFDot] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchDanhGiaList()
      .then((res) => setRows(res.rows.filter((r) => r.active !== 0)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const dotOptions = useMemo(() => [...new Set(rows.map((r) => r.dot_danh_gia))].sort(), [rows])

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (fFrom && r.ngay_danh_gia < fFrom) return false
      if (fTo && r.ngay_danh_gia > fTo) return false
      if (fKhoa && String(r.khoa_id) !== fKhoa) return false
      if (fVitri && String(r.vitri_type_id) !== fVitri) return false
      if (fDot && r.dot_danh_gia !== fDot) return false
      return true
    })
    const bySort: Record<SortKey, (a: DanhGia, b: DanhGia) => number> = {
      newest: (a, b) => b.ngay_danh_gia.localeCompare(a.ngay_danh_gia) || b.id - a.id,
      oldest: (a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia) || a.id - b.id,
      rank_desc: (a, b) => b.pct - a.pct,
      rank_asc: (a, b) => a.pct - b.pct,
      khoa: (a, b) => (a.khoa?.ten_khoa || '').localeCompare(b.khoa?.ten_khoa || '', 'vi'),
    }
    return [...list].sort(bySort[sort])
  }, [rows, fFrom, fTo, fKhoa, fVitri, fDot, sort])

  const kpi = useMemo(() => {
    const n = filtered.length
    if (!n) return { n: 0, okPct: '–', avg: '–', best: '–', bestSub: '' }
    const ok = filtered.filter((r) => r.pct >= 85).length
    const avg = Math.round(filtered.reduce((s, r) => s + r.pct, 0) / n)
    const byKhoa = new Map<string, { sum: number; n: number }>()
    for (const r of filtered) {
      const k = r.khoa?.ten_khoa || String(r.khoa_id)
      const cur = byKhoa.get(k) || { sum: 0, n: 0 }
      cur.sum += r.pct
      cur.n++
      byKhoa.set(k, cur)
    }
    let best = '–'
    let bestAvg = -1
    for (const [k, v] of byKhoa) {
      const a = v.sum / v.n
      if (a > bestAvg) {
        bestAvg = a
        best = k
      }
    }
    return { n, okPct: `${Math.round((ok / n) * 100)}%`, avg: `${avg}%`, best, bestSub: `TB ${Math.round(bestAvg)}%` }
  }, [filtered])

  function exportCSV() {
    const head = ['Ngày', 'Khoa/Phòng', 'Vị trí', 'Đợt', 'Người đánh giá', 'Đạt', 'Tổng tiêu chí', '% Đạt', 'Xếp loại']
    const lines = filtered.map((r) =>
      [
        r.ngay_danh_gia,
        r.khoa?.ten_khoa || '',
        r.vitri_type?.ten_vitri || '',
        r.dot_danh_gia,
        r.nguoi_danh_gia?.username || '',
        r.so_tieu_chi_dat,
        r.so_tieu_chi_tong,
        r.pct,
        r.xep_loai,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    )
    const csv = '﻿' + [head.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tong_hop_5s_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function resetFilters() {
    setFFrom('')
    setFTo('')
    setFKhoa('')
    setFVitri('')
    setFDot('')
    setSort('newest')
  }

  return (
    <div>
      <PageHeader
        icon={<Table2 size={22} />}
        title="Tổng hợp kết quả"
        subtitle="So sánh điểm 5S giữa các khoa/phòng trong một đợt hoặc khoảng thời gian — xếp hạng và xuất báo cáo"
        actions={
          <button className={btnSecondary} onClick={exportCSV} disabled={!filtered.length}>
            <Download size={15} /> Xuất CSV (Excel)
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* ── Bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Từ ngày"><input type="date" className={inputCls} value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></Field>
        <Field label="Đến ngày"><input type="date" className={inputCls} value={fTo} onChange={(e) => setFTo(e.target.value)} /></Field>
        <Field label="Khoa / Phòng">
          <select className={inputCls} value={fKhoa} onChange={(e) => setFKhoa(e.target.value)}>
            <option value="">— Tất cả —</option>
            {khoaList.map((k) => (
              <option key={k.id} value={k.id}>{k.ten_khoa}</option>
            ))}
          </select>
        </Field>
        <Field label="Vị trí">
          <select className={inputCls} value={fVitri} onChange={(e) => setFVitri(e.target.value)}>
            <option value="">— Tất cả —</option>
            {vitriTypes.map((v) => (
              <option key={v.id} value={v.id}>{v.ten_vitri}</option>
            ))}
          </select>
        </Field>
        <Field label="Đợt đánh giá">
          <select className={inputCls} value={fDot} onChange={(e) => setFDot(e.target.value)}>
            <option value="">— Tất cả —</option>
            {dotOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Sắp xếp">
          <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">🕐 Mới nhất lên trên</option>
            <option value="oldest">🕐 Cũ nhất lên trên</option>
            <option value="rank_desc">🏆 Điểm cao → thấp</option>
            <option value="rank_asc">↓ Điểm thấp → cao</option>
            <option value="khoa">🏥 Theo tên đơn vị</option>
          </select>
        </Field>
        <button className={btnSecondary} onClick={resetFilters}>
          <RotateCcw size={14} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">{filtered.length} lượt</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Tổng lượt đánh giá" value={kpi.n} sub="lượt" accent="navy" />
        <KpiCard label="Đạt tốt (≥85%)" value={kpi.okPct} sub="tỷ lệ" accent="green" />
        <KpiCard label="Tỷ lệ đạt trung bình" value={kpi.avg} accent="blue" />
        <KpiCard label="Đơn vị tốt nhất" value={<span className="text-base">{kpi.best}</span>} sub={kpi.bestSub} accent="yellow" />
      </div>

      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Table2 size={36} />} message="Chưa có dữ liệu — hoàn thành bảng kiểm và bấm Lưu kết quả" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Ngày</th>
                  <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium">Đợt</th>
                  <th className="px-4 py-3 font-medium">Người ĐG</th>
                  <th className="px-4 py-3 font-medium">Tiêu chí</th>
                  <th className="px-4 py-3 font-medium">% Đạt</th>
                  <th className="px-4 py-3 font-medium">Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(r.ngay_danh_gia).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{r.khoa?.ten_khoa}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.vitri_type?.ten_vitri}
                      {r.vitri_chi_tiet?.ma_vitri && <span className="text-gray-300"> · {r.vitri_chi_tiet.ma_vitri}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.dot_danh_gia}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.nguoi_danh_gia?.username}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.so_tieu_chi_dat}/{r.so_tieu_chi_tong}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full ${r.pct >= 90 ? 'bg-emerald-500' : r.pct >= 75 ? 'bg-sky-500' : r.pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{r.pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}>
                        {r.xep_loai}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
