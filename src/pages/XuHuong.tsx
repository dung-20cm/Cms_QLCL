import { useEffect, useMemo, useState } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { TrendingUp, RotateCcw, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  PageHeader,
  Field,
  Modal,
  inputCls,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
  useDanhGia,
} from '../components/ui/PageShell'
import SearchableSelect from '../components/ui/SearchableSelect'
import ChartCard from '../components/ui/ChartCard'
import CountUp from '../components/ui/CountUp'
import { fetchTopTieuChiLoi } from '../features/qlcl/api'
import type { TopTieuChiLoi } from '../features/qlcl/api'
import { toneBadgeClass, toneFromPct } from '../features/qlcl/types'
import { loadDanhGia } from '../features/qlcl/danhGiaSlice'

// Thứ tự + tên/màu cố định 5 nhóm 5S — khớp bảng màu file mẫu 5S_Dashboard_BVTB_v4
const S_META: Record<string, { name: string; color: string }> = {
  S1: { name: 'Sàng lọc', color: '#D85A30' },
  S2: { name: 'Sắp xếp', color: '#BA7517' },
  S3: { name: 'Sạch sẽ', color: '#1D9E75' },
  S4: { name: 'Săn sóc', color: '#185FA5' },
  S5: { name: 'Sẵn sàng', color: '#534AB7' },
}
const S_IDS = ['S1', 'S2', 'S3', 'S4', 'S5']

// ≥80% luôn tô xanh (đạt tốt), <60% luôn tô đỏ (chưa đạt) — khoảng giữa dùng
// đúng màu đặc trưng của nhóm S đó, khớp cách tô màu file mẫu (getColor2).
function sTierColor(pct: number, base: string): string {
  return pct >= 80 ? '#1D9E75' : pct >= 60 ? base : '#E24B4A'
}
// Màu theo mức % tổng (không gắn với 1 nhóm S cụ thể) — khớp thang màu đã
// dùng ở bảng xếp hạng khoa (đỏ <60 · vàng <75 · xanh dương <90 · xanh lá ≥90)
function pctTierColor(pct: number): string {
  return pct >= 90 ? '#1D9E75' : pct >= 75 ? '#185FA5' : pct >= 60 ? '#BA7517' : '#E24B4A'
}

type SortMode = 'newest' | 'oldest' | 'rank_desc' | 'rank_asc' | 'khoa'

export default function XuHuong() {
  const { khoaList, vitriTypes } = useCatalog()
  const dispatch = useAppDispatch()
  const mode = useAppSelector((s) => s.theme.mode)
  const isDark = mode === 'dark'

  // Dữ liệu lấy từ cache Redux dùng chung (danhGiaSlice) -- không tự gọi API riêng nữa.
  const { rows, status: danhGiaStatus, error } = useDanhGia()
  const loading = danhGiaStatus === 'idle' || danhGiaStatus === 'loading'

  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fKhoa, setFKhoa] = useState('')
  const [fVitri, setFVitri] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [sortMode, setSortMode] = useState<SortMode>('newest')

  const [top10, setTop10] = useState<TopTieuChiLoi[]>([])
  const [top10Loading, setTop10Loading] = useState(false)
  const [drillItem, setDrillItem] = useState<TopTieuChiLoi | null>(null)

  // Top 10 tiêu chí lỗi — tính riêng ở BE theo cùng bộ lọc (from/to/khoa/vitri)
  useEffect(() => {
    setTop10Loading(true)
    fetchTopTieuChiLoi({
      tu_ngay: fFrom || undefined,
      den_ngay: fTo || undefined,
      khoa_id: fKhoa ? Number(fKhoa) : undefined,
      vitri_type_id: fVitri ? Number(fVitri) : undefined,
    })
      .then((res) => setTop10(res.data))
      .catch(() => setTop10([]))
      .finally(() => setTop10Loading(false))
  }, [fFrom, fTo, fKhoa, fVitri])

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
      chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 700,
          animateGradually: { enabled: true, delay: 120 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
      },
      theme: { mode },
      colors: ['#034ea2'],
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
      chart: {
        type: 'bar',
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 700,
          animateGradually: { enabled: true, delay: 80 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
      },
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

  // ── Tỷ lệ đạt trung bình theo từng nhóm S1..S5 (tất cả lượt đang lọc) ──
  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {}
    for (const r of filtered) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 }
        cur.ok += s.ok
        cur.total += s.total
        agg[s.id] = cur
      }
    }
    const out: Record<string, number> = {}
    for (const id of S_IDS) {
      const v = agg[id]
      out[id] = v && v.total ? Math.round((v.ok / v.total) * 100) : 0
    }
    return out
  }, [filtered])

  // Hạng (rank) cố định theo % đạt giảm dần — không đổi theo lựa chọn sắp xếp bảng
  const rankMap = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.pct - a.pct)
    const m = new Map<number, number>()
    sorted.forEach((r, i) => m.set(r.id, i + 1))
    return m
  }, [filtered])

  const displayRows = useMemo(() => {
    const arr = [...filtered]
    switch (sortMode) {
      case 'newest':
        return arr.sort((a, b) => b.ngay_danh_gia.localeCompare(a.ngay_danh_gia) || b.id - a.id)
      case 'oldest':
        return arr.sort((a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia) || a.id - b.id)
      case 'rank_desc':
        return arr.sort((a, b) => b.pct - a.pct)
      case 'rank_asc':
        return arr.sort((a, b) => a.pct - b.pct)
      case 'khoa':
        return arr.sort((a, b) => (a.khoa?.ten_khoa || '').localeCompare(b.khoa?.ten_khoa || '', 'vi'))
      default:
        return arr
    }
  }, [filtered, sortMode])

  return (
    <div>
      <PageHeader
        icon={<TrendingUp size={22} />}
        title="Xu hướng theo thời gian"
        subtitle="Theo dõi thay đổi điểm 5S qua các đợt — phát hiện sớm xu hướng suy giảm"
      />
      {error && <ErrorBanner message={error} onRetry={() => dispatch(loadDanhGia())} />}

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
          {/* ── Tỷ lệ đạt trung bình theo từng nhóm 5S ── */}
          <ChartCard title="Tỷ lệ đạt trung bình theo từng nhóm 5S" subtitle="Tính trên toàn bộ lượt đang lọc">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {S_IDS.map((id, i) => {
                const meta = S_META[id]
                const pct = sAvg[id] ?? 0
                const color = sTierColor(pct, meta.color)
                return (
                  <div
                    key={id}
                    className="animate-rise-in rounded-xl border border-gray-100 p-3 text-center dark:border-gray-800"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <p className="text-xs font-bold" style={{ color: meta.color }}>{id}</p>
                    <p className="mt-1 text-2xl font-bold" style={{ color }}>
                      <CountUp value={pct} suffix="%" />
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{meta.name}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </ChartCard>

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

          {/* ── Top 10 tiêu chí bị ✗ nhiều nhất ── */}
          <ChartCard title="🔴 Top 10 tiêu chí bị ✗ nhiều nhất" subtitle="Bấm vào 1 dòng để xem chi tiết theo khoa">
            {top10Loading ? (
              <LoadingRow />
            ) : top10.length === 0 ? (
              <p className="text-sm text-gray-400">Không có tiêu chí nào bị ✗ trong khoảng đang lọc 🎉</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                      <th className="py-2 pr-3 font-medium">#</th>
                      <th className="py-2 pr-3 font-medium">S</th>
                      <th className="py-2 pr-3 font-medium">Nội dung tiêu chí</th>
                      <th className="py-2 pr-3 font-medium">Số lần ✗</th>
                      <th className="py-2 font-medium">% lượt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10.map((t, i) => (
                      <tr
                        key={t.checklist_item_id}
                        onClick={() => setDrillItem(t)}
                        className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                      >
                        <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded px-1.5 py-0.5 text-xs font-bold" style={{ color: S_META[t.s_id]?.color, background: `${S_META[t.s_id]?.color}1a` }}>
                            {t.s_id}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-gray-700 dark:text-gray-200">
                          {t.tc}
                          {t.sub && <span className="ml-1 text-xs text-gray-400">({t.sub})</span>}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (t.fail_count / top10[0].fail_count) * 100)}%`,
                                  background: S_META[t.s_id]?.color,
                                }}
                              />
                            </div>
                            <span className="font-semibold" style={{ color: S_META[t.s_id]?.color }}>{t.fail_count}</span>
                          </div>
                        </td>
                        <td className="py-2 font-medium text-gray-600 dark:text-gray-300">{t.rate_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>

          {/* ── Bảng chi tiết từng lượt ── */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Chi tiết kết quả theo lượt đánh giá</h3>
              <select className={inputCls} style={{ fontSize: 12, padding: '3px 8px' }} value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
                <option value="newest">Mới nhất lên trên</option>
                <option value="oldest">Cũ nhất lên trên</option>
                <option value="rank_desc">Xếp hạng cao → thấp</option>
                <option value="rank_asc">Xếp hạng thấp → cao</option>
                <option value="khoa">Theo tên đơn vị</option>
              </select>
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white dark:bg-gray-900">
                  <tr className="whitespace-nowrap border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                    <th className="px-5 py-3 font-medium">Hạng</th>
                    <th className="px-4 py-3 font-medium">Ngày</th>
                    <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
                    <th className="px-4 py-3 font-medium">Vị trí</th>
                    {S_IDS.map((id) => (
                      <th key={id} className="px-2 py-3 text-center font-bold" style={{ color: S_META[id].color }}>{id}</th>
                    ))}
                    <th className="px-4 py-3 font-medium">Tổng</th>
                    <th className="px-4 py-3 font-medium">Xếp loại</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => {
                    const byS = Object.fromEntries((r.sScores || []).map((s) => [s.id, s.pct]))
                    const totalColor = pctTierColor(r.pct)
                    return (
                      <tr key={r.id} className="whitespace-nowrap border-b border-gray-50 last:border-0 dark:border-gray-800">
                        <td className="px-5 py-2.5 text-gray-400">#{rankMap.get(r.id)}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{new Date(r.ngay_danh_gia).toLocaleDateString('vi-VN')}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-200">{r.khoa?.ten_khoa}</td>
                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.vitri_type?.ten_vitri}</td>
                        {S_IDS.map((id) => {
                          const pct = byS[id]
                          if (pct == null) {
                            return (
                              <td key={id} className="px-2 py-2.5 text-center text-gray-300 dark:text-gray-700">—</td>
                            )
                          }
                          const c = sTierColor(pct, S_META[id].color)
                          return (
                            <td key={id} className="px-2 py-2.5">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-bold" style={{ color: c }}>{pct}%</span>
                                <div className="h-1 w-10 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                                </div>
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-4 py-2.5 font-bold" style={{ color: totalColor }}>{r.pct}%</td>
                        <td className="px-4 py-2.5">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}>{r.xep_loai}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal drill-down: khoa nào bị lỗi tiêu chí đã chọn ── */}
      <Modal
        open={!!drillItem}
        title={drillItem ? `Chi tiết lỗi: ${drillItem.tc}` : ''}
        onClose={() => setDrillItem(null)}
        footer={
          <button className={btnSecondary} onClick={() => setDrillItem(null)}>
            <X size={14} /> Đóng
          </button>
        }
      >
        {drillItem && (
          <div>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Tổng <b style={{ color: S_META[drillItem.s_id]?.color }}>{drillItem.fail_count}</b> lần ✗ trên {drillItem.rate_pct}% lượt đánh giá — theo khoa/phòng:
            </p>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {drillItem.by_khoa.map((k) => (
                <li key={k.khoa} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/50">
                  <span className="text-gray-700 dark:text-gray-200">{k.khoa}</span>
                  <span className="font-bold" style={{ color: S_META[drillItem.s_id]?.color }}>{k.count} lần</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  )
}
