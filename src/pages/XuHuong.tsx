import { useCallback, useEffect, useMemo, useState } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { TrendingUp, RotateCcw } from 'lucide-react'
import { useAppSelector } from '../app/hooks'
import {
  PageHeader,
  Field,
  inputCls,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
} from '../components/ui/PageShell'
import SearchableSelect from '../components/ui/SearchableSelect'
import ChartCard from '../components/ui/ChartCard'
import { fetchDanhGiaList } from '../features/qlcl/api'
import type { DanhGia } from '../features/qlcl/types'
import { toneBadgeClass, toneFromPct } from '../features/qlcl/types'

export default function XuHuong() {
  const { khoaList, vitriTypes } = useCatalog()
  const mode = useAppSelector((s) => s.theme.mode)
  const isDark = mode === 'dark'

  const [rows, setRows] = useState<DanhGia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fKhoa, setFKhoa] = useState('')
  const [fVitri, setFVitri] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchDanhGiaList()
      .then((res) => setRows(res.rows.filter((r) => r.active !== 0)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (fFrom && r.ngay_danh_gia < fFrom) return false
        if (fTo && r.ngay_danh_gia > fTo) return false
        if (fKhoa && String(r.khoa_id) !== fKhoa) return false
        if (fVitri && String(r.vitri_type_id) !== fVitri) return false
        return true
      }),
    [rows, fFrom, fTo, fKhoa, fVitri],
  )

  const yearOptions = useMemo(
    () => [...new Set(rows.map((r) => Number(r.ngay_danh_gia.slice(0, 4))))].sort((a, b) => b - a),
    [rows],
  )

  // ── Line chart: % đạt TB theo tháng trong năm (chỉ hiện tháng có dữ liệu
  //    — ApexCharts render marker sai vị trí khi series chứa null đầu chuỗi) ──
  const monthly = useMemo(() => {
    const buckets: { sum: number; n: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }))
    for (const r of filtered) {
      if (Number(r.ngay_danh_gia.slice(0, 4)) !== year) continue
      const m = Number(r.ngay_danh_gia.slice(5, 7)) - 1
      buckets[m].sum += r.pct
      buckets[m].n++
    }
    const labels: string[] = []
    const values: number[] = []
    buckets.forEach((b, i) => {
      if (b.n) {
        labels.push(`T${i + 1}`)
        values.push(Math.round(b.sum / b.n))
      }
    })
    return { labels, values }
  }, [filtered, year])

  const lineOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
      theme: { mode },
      colors: ['#465fff'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2.5 },
      // markers để tháng có dữ liệu đơn lẻ vẫn hiển thị (không có điểm liền kề để nối line)
      markers: { size: 5, strokeWidth: 2, hover: { size: 7 } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } },
      grid: { borderColor: isDark ? '#1f2937' : '#f1f2f4' },
      xaxis: {
        categories: monthly.labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } },
      },
      yaxis: { min: 0, max: 100, labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } } },
      tooltip: { theme: mode, y: { formatter: (v) => (v == null ? '—' : `${v}%`) } },
      annotations: {
        yaxis: [
          {
            y: 90,
            borderColor: '#10b981',
            strokeDashArray: 5,
            label: {
              text: 'Mục tiêu 90%',
              style: { color: '#fff', background: '#10b981', fontSize: '10px' },
            },
          },
        ],
      },
    }),
    [mode, isDark, monthly.labels],
  )

  // ── Bar chart: xếp hạng TB theo khoa ──
  const khoaRank = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>()
    for (const r of filtered) {
      const k = r.khoa?.ten_khoa || String(r.khoa_id)
      const cur = map.get(k) || { sum: 0, n: 0 }
      cur.sum += r.pct
      cur.n++
      map.set(k, cur)
    }
    return [...map.entries()]
      .map(([k, v]) => ({ khoa: k, avg: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => b.avg - a.avg)
  }, [filtered])

  const barOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
      theme: { mode },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          barHeight: '60%',
          colors: {
            ranges: [
              { from: 0, to: 59, color: '#ef4444' },
              { from: 60, to: 74, color: '#f59e0b' },
              { from: 75, to: 89, color: '#0ea5e9' },
              { from: 90, to: 100, color: '#10b981' },
            ],
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (v) => `${v}%`,
        style: { fontSize: '11px' },
      },
      grid: { borderColor: isDark ? '#1f2937' : '#f1f2f4' },
      xaxis: {
        categories: khoaRank.map((k) => k.khoa),
        max: 100,
        labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280' } },
      },
      yaxis: { labels: { style: { colors: isDark ? '#9ca3af' : '#6b7280', fontSize: '11px' }, maxWidth: 220 } },
      tooltip: { theme: mode, y: { formatter: (v) => `${v}% đạt TB` } },
    }),
    [mode, isDark, khoaRank],
  )

  // ── Điểm mạnh / cần cải thiện ──
  const strengths = khoaRank.filter((k) => k.avg >= 90).slice(0, 5)
  const weaknesses = [...khoaRank].reverse().filter((k) => k.avg < 75).slice(0, 5)

  return (
    <div>
      <PageHeader
        icon={<TrendingUp size={22} />}
        title="Xu hướng theo thời gian"
        subtitle="Theo dõi thay đổi điểm 5S qua các đợt — phát hiện sớm xu hướng suy giảm"
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* ── Bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Từ ngày"><input type="date" className={inputCls} value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></Field>
        <Field label="Đến ngày"><input type="date" className={inputCls} value={fTo} onChange={(e) => setFTo(e.target.value)} /></Field>
        <Field label="Khoa / Phòng">
          <SearchableSelect
            value={fKhoa}
            onChange={(v) => setFKhoa(v)}
            options={khoaList.map((k) => ({ value: String(k.id), label: k.ten_khoa }))}
            placeholder="— Tất cả —"
          />
        </Field>
        <Field label="Vị trí">
          <select className={inputCls} value={fVitri} onChange={(e) => setFVitri(e.target.value)}>
            <option value="">— Tất cả —</option>
            {vitriTypes.map((v) => (
              <option key={v.id} value={v.id}>{v.ten_vitri}</option>
            ))}
          </select>
        </Field>
        <button className={btnSecondary} onClick={() => { setFFrom(''); setFTo(''); setFKhoa(''); setFVitri('') }}>
          <RotateCcw size={14} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">{filtered.length} lượt</span>
      </div>

      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<TrendingUp size={36} />} message="Cần ít nhất 1 lượt đánh giá để hiển thị xu hướng" />
      ) : (
        <div className="space-y-5">
          <ChartCard
            title={`Xu hướng tỷ lệ đạt theo tháng — năm ${year}`}
            subtitle="Trung bình % đạt của tất cả lượt trong tháng · vạch xanh = mục tiêu 90%"
            action={
              <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {(yearOptions.length ? yearOptions : [year]).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            }
          >
            <Chart
              options={lineOptions}
              series={[{ name: 'Tỷ lệ đạt TB (%)', data: monthly.values }]}
              type="area"
              height={280}
            />
          </ChartCard>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ChartCard title="Xếp hạng % đạt trung bình theo đơn vị" subtitle="Màu theo mức xếp loại: đỏ <60 · vàng <75 · xanh dương <90 · xanh lá ≥90">
                <Chart
                  options={barOptions}
                  series={[{ name: '% đạt TB', data: khoaRank.map((k) => k.avg) }]}
                  type="bar"
                  height={Math.max(200, khoaRank.length * 32)}
                />
              </ChartCard>
            </div>
            <div className="space-y-5">
              <ChartCard title="💪 Điểm mạnh" subtitle="Đơn vị đạt ≥90% trung bình">
                {strengths.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có đơn vị nào đạt ≥90%</p>
                ) : (
                  <ul className="space-y-2">
                    {strengths.map((k) => (
                      <li key={k.khoa} className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/10">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{k.khoa}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{k.avg}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>
              <ChartCard title="⚠ Cần cải thiện" subtitle="Đơn vị dưới 75% trung bình">
                {weaknesses.length === 0 ? (
                  <p className="text-sm text-gray-400">Không có đơn vị nào dưới 75% 🎉</p>
                ) : (
                  <ul className="space-y-2">
                    {weaknesses.map((k) => (
                      <li key={k.khoa} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-500/10">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{k.khoa}</span>
                        <span className="font-bold text-red-500">{k.avg}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>
            </div>
          </div>

          {/* ── Bảng chi tiết từng lượt ── */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Chi tiết kết quả theo lượt đánh giá</h3>
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white dark:bg-gray-900">
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                    <th className="px-5 py-3 font-medium">Ngày</th>
                    <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
                    <th className="px-4 py-3 font-medium">Vị trí</th>
                    <th className="px-4 py-3 font-medium">% Đạt</th>
                    <th className="px-4 py-3 font-medium">Xếp loại</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered]
                    .sort((a, b) => b.ngay_danh_gia.localeCompare(a.ngay_danh_gia))
                    .map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0 dark:border-gray-800">
                        <td className="px-5 py-2.5 text-gray-500 dark:text-gray-400">{new Date(r.ngay_danh_gia).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-200">{r.khoa?.ten_khoa}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.vitri_type?.ten_vitri}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">{r.pct}%</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}>{r.xep_loai}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
