import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, Download } from 'lucide-react'
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
import { fetchPhotoGalleryList } from '../features/qlcl/api'
import type { PhotoGallery } from '../features/qlcl/types'
import { toneBadgeClass, toneFromPct } from '../features/qlcl/types'

export default function Anh5S() {
  const { khoaList } = useCatalog()
  const [photos, setPhotos] = useState<PhotoGallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bộ lọc
  const [fKhoa, setFKhoa] = useState('')
  const [fLoai, setFLoai] = useState('') // '', 'dat', 'khdat'
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [preview, setPreview] = useState<PhotoGallery | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchPhotoGalleryList()
      .then((res) => setPhotos(res.rows.filter((p) => p.active !== 0)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được ảnh'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      const dg = p.danh_gia
      if (fKhoa && String(dg?.khoa_id) !== fKhoa) return false
      if (fLoai === 'dat' && (dg?.pct ?? 0) < 60) return false
      if (fLoai === 'khdat' && (dg?.pct ?? 0) >= 60) return false
      const ngay = dg?.ngay_danh_gia || p.createdAt?.slice(0, 10)
      if (fFrom && ngay < fFrom) return false
      if (fTo && ngay > fTo) return false
      return true
    })
  }, [photos, fKhoa, fLoai, fFrom, fTo])

  const kpi = useMemo(() => {
    const luotIds = new Set(filtered.map((p) => p.danh_gia_id))
    const dat = filtered.filter((p) => (p.danh_gia?.pct ?? 0) >= 60)
    return {
      luot: luotIds.size,
      dat: dat.length,
      khdat: filtered.length - dat.length,
      total: filtered.length,
    }
  }, [filtered])

  // Gom ảnh theo lượt đánh giá
  const groups = useMemo(() => {
    const map = new Map<number, { dg: PhotoGallery['danh_gia']; list: PhotoGallery[] }>()
    for (const p of filtered) {
      if (!map.has(p.danh_gia_id)) map.set(p.danh_gia_id, { dg: p.danh_gia, list: [] })
      map.get(p.danh_gia_id)!.list.push(p)
    }
    return [...map.values()].sort((a, b) =>
      (b.dg?.ngay_danh_gia || '').localeCompare(a.dg?.ngay_danh_gia || ''),
    )
  }, [filtered])

  return (
    <div>
      <PageHeader
        icon={<Camera size={22} />}
        title="Ảnh 5S — minh chứng đánh giá"
        subtitle="Ảnh chụp kèm khi đánh giá bảng kiểm — được tải lên từ tab Bảng kiểm, lưu trên Cloudinary"
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="📷 Lượt đánh giá có ảnh" value={kpi.luot} accent="navy" />
        <KpiCard label="✅ Ảnh thuộc lượt Đạt (≥60%)" value={kpi.dat} accent="green" />
        <KpiCard label="❌ Ảnh thuộc lượt Chưa đạt" value={kpi.khdat} accent="red" />
        <KpiCard label="🖼 Tổng ảnh" value={kpi.total} accent="yellow" />
      </div>

      {/* ── Bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex gap-1.5">
          {[
            { v: '', label: 'Tất cả' },
            { v: 'dat', label: '✅ Đạt' },
            { v: 'khdat', label: '❌ Chưa đạt' },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setFLoai(o.v)}
              className={`h-9 rounded-full border px-4 text-xs font-medium transition ${
                fLoai === o.v
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
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
        <button className={btnSecondary} onClick={() => { setFKhoa(''); setFLoai(''); setFFrom(''); setFTo('') }}>
          ↺ Đặt lại
        </button>
      </div>

      {loading ? (
        <LoadingRow />
      ) : groups.length === 0 ? (
        <EmptyState icon={<Camera size={36} />} message="Chưa có ảnh minh chứng — tải ảnh lên khi lưu Bảng kiểm" />
      ) : (
        <div className="space-y-5">
          {groups.map(({ dg, list }) => (
            <div key={list[0].danh_gia_id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{dg?.khoa?.ten_khoa || `Lượt #${list[0].danh_gia_id}`}</p>
                  <span className="text-xs text-gray-400">
                    {dg?.vitri_type?.ten_vitri} · {dg?.ngay_danh_gia && new Date(dg.ngay_danh_gia).toLocaleDateString('vi-VN')} · {dg?.dot_danh_gia}
                  </span>
                </div>
                {dg && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneBadgeClass[toneFromPct(dg.pct)]}`}>
                    {dg.pct}% · {dg.xep_loai}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 xl:grid-cols-6">
                {list.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreview(p)}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800"
                  >
                    <img
                      src={p.url_anh}
                      alt={p.ten_file || 'Ảnh 5S'}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-2 py-1 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                      {p.ten_file || p.url_anh.split('/').pop()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={() => setPreview(null)}>
          <div className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={preview.url_anh} alt={preview.ten_file || ''} className="max-h-[80vh] rounded-xl object-contain" />
            <div className="mt-3 flex items-center justify-between text-sm text-white/80">
              <span>
                {preview.danh_gia?.khoa?.ten_khoa} · {preview.ten_file}
              </span>
              <a href={preview.url_anh} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">
                <Download size={13} /> Mở ảnh gốc
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
