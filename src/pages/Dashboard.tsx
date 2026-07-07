import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Percent, Building2, Wrench } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import ChartCard from '../components/ui/ChartCard'
import TrendChart from '../components/charts/TrendChart'
import GroupBreakdownChart from '../components/charts/GroupBreakdownChart'
import TargetChart from '../components/charts/TargetChart'
import { LoadingRow, ErrorBanner, EmptyState } from '../components/ui/PageShell'
import { fetchDanhGiaList, fetchKhacPhucList, fetchDanhGiaById } from '../features/qlcl/api'
import type { SScore } from '../features/qlcl/api'
import type { DanhGia, KhacPhuc } from '../features/qlcl/types'
import { toneBadgeClass, toneFromPct } from '../features/qlcl/types'

const TARGET_PCT = 90

// "2026-07-05" -> "T7/26"
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `T${Number(m)}/${y.slice(2)}`
}

export default function Dashboard() {
  const [rows, setRows] = useState<DanhGia[]>([])
  const [khacPhuc, setKhacPhuc] = useState<KhacPhuc[]>([])
  const [sScores, setSScores] = useState<SScore[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchDanhGiaList(),
      fetchKhacPhucList().catch(() => ({ rows: [] as KhacPhuc[], total: 0 })),
    ])
      .then(async ([dg, kp]) => {
        if (cancelled) return
        const active = dg.rows.filter((r) => r.active !== 0)
        setRows(active)
        setKhacPhuc(kp.rows.filter((r) => r.active !== 0))

        // Điểm S1..S5: lấy chi tiết tối đa 10 lượt đánh giá gần nhất
        const latest = [...active]
          .sort((a, b) => b.ngay_danh_gia.localeCompare(a.ngay_danh_gia) || b.id - a.id)
          .slice(0, 10)
        const details = await Promise.all(
          latest.map((r) => fetchDanhGiaById(r.id).then((d) => d.sScores).catch(() => null)),
        )
        if (!cancelled) setSScores(details.filter((d): d is SScore[] => !!d))
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.ngay_danh_gia.localeCompare(a.ngay_danh_gia) || b.id - a.id),
    [rows],
  )

  // ── Thống kê tổng quan ──
  const stats = useMemo(() => {
    const n = rows.length
    const avg = n ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / n) : 0

    // Điểm TB từng khoa → đếm khoa đạt Xuất sắc (>= 90%)
    const byKhoa = new Map<number, { sum: number; n: number }>()
    for (const r of rows) {
      const cur = byKhoa.get(r.khoa_id) || { sum: 0, n: 0 }
      cur.sum += r.pct
      cur.n++
      byKhoa.set(r.khoa_id, cur)
    }
    const excellent = [...byKhoa.values()].filter((v) => v.sum / v.n >= 90).length

    const openKP = khacPhuc.filter((k) => k.trang_thai !== 'Đã xong' && k.trang_thai !== 'Hoàn thành').length

    // % thay đổi so với tháng trước (lượt đánh giá + tỷ lệ đạt)
    const byMonth = new Map<string, { sum: number; n: number }>()
    for (const r of rows) {
      const ym = r.ngay_danh_gia.slice(0, 7)
      const cur = byMonth.get(ym) || { sum: 0, n: 0 }
      cur.sum += r.pct
      cur.n++
      byMonth.set(ym, cur)
    }
    const months = [...byMonth.keys()].sort()
    let dLuot = 0
    let dPct = 0
    if (months.length >= 2) {
      const cur = byMonth.get(months[months.length - 1])!
      const prev = byMonth.get(months[months.length - 2])!
      dLuot = prev.n ? Math.round(((cur.n - prev.n) / prev.n) * 100) : 0
      const curAvg = cur.sum / cur.n
      const prevAvg = prev.sum / prev.n
      dPct = prevAvg ? Math.round(((curAvg - prevAvg) / prevAvg) * 10) / 10 : 0
    }

    return { n, avg, excellent, totalKhoa: byKhoa.size, openKP, dLuot, dPct }
  }, [rows, khacPhuc])

  // ── Xu hướng theo tháng (tối đa 7 tháng gần nhất) ──
  const trend = useMemo(() => {
    const byMonth = new Map<string, { sum: number; n: number; khoa: Set<number> }>()
    for (const r of rows) {
      const ym = r.ngay_danh_gia.slice(0, 7)
      const cur = byMonth.get(ym) || { sum: 0, n: 0, khoa: new Set<number>() }
      cur.sum += r.pct
      cur.n++
      cur.khoa.add(r.khoa_id)
      byMonth.set(ym, cur)
    }
    const months = [...byMonth.keys()].sort().slice(-7)
    return {
      categories: months.map(monthLabel),
      series: [
        { name: 'Tỷ lệ đạt trung bình (%)', data: months.map((m) => Math.round(byMonth.get(m)!.sum / byMonth.get(m)!.n)) },
        { name: 'Số khoa tham gia đánh giá', data: months.map((m) => byMonth.get(m)!.khoa.size) },
      ],
    }
  }, [rows])

  // ── Tỷ lệ đạt S1..S5 (từ các lượt đánh giá gần nhất) ──
  const groupData = useMemo(() => {
    const agg = new Map<string, { ok: number; total: number }>()
    for (const scores of sScores) {
      for (const s of scores) {
        const cur = agg.get(s.id) || { ok: 0, total: 0 }
        cur.ok += s.ok
        cur.total += s.total
        agg.set(s.id, cur)
      }
    }
    return ['S1', 'S2', 'S3', 'S4', 'S5'].map((id) => {
      const v = agg.get(id)
      return v && v.total ? Math.round((v.ok / v.total) * 100) : 0
    })
  }, [sScores])

  const statCards = [
    { label: 'Tổng lượt đánh giá', value: String(stats.n), change: stats.dLuot, icon: ClipboardCheck },
    { label: 'Tỷ lệ đạt trung bình', value: `${stats.avg}%`, change: stats.dPct, icon: Percent },
    { label: 'Khoa/Phòng đạt Xuất sắc', value: `${stats.excellent} / ${stats.totalKhoa}`, change: 0, icon: Building2 },
    { label: 'Hành động khắc phục đang mở', value: String(stats.openKP), change: 0, icon: Wrench },
  ]

  if (loading) return <LoadingRow text="Đang tải số liệu tổng quan..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Analytics — Tổng quan chất lượng 5S</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Số liệu tổng hợp toàn viện từ các lượt đánh giá đã lưu trên máy chủ.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {rows.length === 0 && !error ? (
        <EmptyState message="Chưa có lượt đánh giá nào. Vào Bảng kiểm để chấm điểm 5S đầu tiên." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ChartCard title="Xu hướng đánh giá theo tháng" subtitle={`${trend.categories.length} tháng gần nhất`}>
                <TrendChart categories={trend.categories} series={trend.series} />
              </ChartCard>
            </div>
            <ChartCard title="Mục tiêu tỷ lệ đạt" subtitle="Toàn viện — luỹ kế">
              <TargetChart value={stats.avg} />
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Mục tiêu {TARGET_PCT}% · Hiện tại {stats.avg}%
              </p>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <ChartCard title="Kết quả gần đây" subtitle="5 lượt đánh giá mới nhất">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                        <th className="pb-3 pr-4 font-medium">Khoa/Phòng</th>
                        <th className="pb-3 pr-4 font-medium">Vị trí</th>
                        <th className="pb-3 pr-4 font-medium">Ngày</th>
                        <th className="pb-3 pr-4 font-medium">% Đạt</th>
                        <th className="pb-3 font-medium">Xếp loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.slice(0, 5).map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0 dark:border-gray-800">
                          <td className="py-3 pr-4 font-medium text-gray-700 dark:text-gray-200">{r.khoa?.ten_khoa || r.khoa_id}</td>
                          <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{r.vitri_type?.ten_vitri || '—'}</td>
                          <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{r.ngay_danh_gia}</td>
                          <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{r.pct}%</td>
                          <td className="py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}>
                              {r.xep_loai}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </div>
            <ChartCard title="Tỷ lệ đạt theo nhóm 5S" subtitle="S1 → S5 (10 lượt gần nhất)">
              <GroupBreakdownChart data={groupData} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
