import { useCallback, useEffect, useMemo, useState } from 'react'
import SliderRaw from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'

// FIX: Vite/esbuild bundle CJS cua react-slick bi "double-wrap" default export
// (chuoi re-export lib/index.js -> lib/slider.js) khien import mac dinh tra ve
// { default: Slider } thay vi chinh component Slider -- gay loi React #130
// "Element type is invalid ... but got: object" khi mo lightbox. Tu unwrap phong thu.
const Slider = ((SliderRaw as unknown as { default?: typeof SliderRaw }).default ?? SliderRaw) as typeof SliderRaw
import { Camera, Download, Plus, Pencil, Trash2, X, Check, AlertTriangle, Upload, FileText, FileBarChart, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppSelector } from '../app/hooks'
import {
  PageHeader,
  KpiCard,
  Field,
  inputCls,
  btnPrimary,
  btnSecondary,
  btnDanger,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  Modal,
  useCatalog,
} from '../components/ui/PageShell'
import SearchableSelect from '../components/ui/SearchableSelect'
import {
  fetchPhotoGalleryList,
  createPhotoGallery,
  updatePhotoGallery,
  deletePhotoGallery,
  uploadImage,
} from '../features/qlcl/api'
import type { PhotoGallery } from '../features/qlcl/types'
import { toneBadgeClass, toneFromPct, KET_QUA_ANH_OPTIONS } from '../features/qlcl/types'
import { exportAnh5SPpt, type Anh5SPptRecord } from '../features/qlcl/exportAnh5SPpt'

const todayStr = () => new Date().toISOString().slice(0, 10)

// Tag "ket qua" cua anh gui doc lap -> quy doi % de to mau dong bo voi luot danh gia that
function pctFromKetQua(kq: string | null): number {
  if (kq === 'Đạt tốt') return 95
  if (kq === 'Đạt') return 80
  return 40
}

interface FormState {
  // undefined khi them moi; co gia tri khi sua 1 luot gui anh doc lap da co
  editKey?: string
  editIds?: number[]
  khoa_id: number | ''
  vitri_type_id: number | ''
  ngay_chup: string
  nguoi_gui_id: number | ''
  ket_qua: string
  ghi_chu: string
  existingPhotos: PhotoGallery[] // anh da luu (chi co khi sua) -- co the xoa bot
  newFiles: File[] // anh moi chon them (chua upload)
}

function emptyForm(defaultNguoiId: number | ''): FormState {
  return {
    khoa_id: '',
    vitri_type_id: '',
    ngay_chup: todayStr(),
    nguoi_gui_id: defaultNguoiId,
    ket_qua: '',
    ghi_chu: '',
    existingPhotos: [],
    newFiles: [],
  }
}

// Nhom anh gui doc lap (khong qua Bang kiem) theo cung 1 luot gui -- vi moi anh la
// 1 dong photo_gallery rieng, cac anh cung 1 luot gui thi trung het cac field mo ta.
function manualGroupKey(p: PhotoGallery): string {
  return ['m', p.khoa_id, p.vitri_type_id, p.ngay_chup, p.nguoi_gui_id, p.ket_qua, p.ghi_chu].join('|')
}

// Nut prev/next tuy chinh cho react-slick trong lightbox (thay the mui ten mac dinh)
function SliderArrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={dir === 'prev' ? 'Ảnh trước' : 'Ảnh sau'}
      className={`absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white ${
        dir === 'prev' ? 'left-2' : 'right-2'
      }`}
    >
      {dir === 'prev' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  )
}

export default function Anh5S() {
  const { khoaList, vitriTypes, users } = useCatalog()
  const user = useAppSelector((s) => s.auth.user)
  const [photos, setPhotos] = useState<PhotoGallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bo loc
  const [fKhoa, setFKhoa] = useState('')
  const [fLoai, setFLoai] = useState('') // '', 'dat', 'khdat'
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fNguoi, setFNguoi] = useState('')
  // Lightbox xem nhiều ảnh cùng 1 lượt gửi -- trượt qua lại bằng react-slick
  const [previewList, setPreviewList] = useState<PhotoGallery[] | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const preview = previewList ? previewList[previewIndex] : null

  function openPreview(list: PhotoGallery[], startIndex: number) {
    setPreviewList(list)
    setPreviewIndex(startIndex)
  }
  function closePreview() {
    setPreviewList(null)
    setPreviewIndex(0)
  }

  // Dong lightbox bang phim Esc
  useEffect(() => {
    if (!previewList) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewList])

  // Them / sua anh
  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')

  // Xoa -- dung chung cho xoa 1 anh hoac xoa ca luot gui thu cong
  const [deleting, setDeleting] = useState<{ ids: number[]; label: string } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Xuat PPTX
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
      const khoaId = dg ? dg.khoa_id : p.khoa_id
      const pct = dg ? dg.pct : pctFromKetQua(p.ket_qua)
      const ngay = dg?.ngay_danh_gia || p.ngay_chup || p.createdAt?.slice(0, 10)
      // Nguoi thuc hien: anh tu Bang kiem lay nguoi_danh_gia, anh gui doc lap lay nguoi_gui
      const nguoiId = dg ? dg.nguoi_danh_gia?.id : p.nguoi_gui_id
      if (fKhoa && String(khoaId) !== fKhoa) return false
      if (fLoai === 'dat' && pct < 60) return false
      if (fLoai === 'khdat' && pct >= 60) return false
      if (fFrom && ngay && ngay < fFrom) return false
      if (fTo && ngay && ngay > fTo) return false
      if (fNguoi && String(nguoiId ?? '') !== fNguoi) return false
      return true
    })
  }, [photos, fKhoa, fLoai, fFrom, fTo, fNguoi])

  const kpi = useMemo(() => {
    const luotIds = new Set(filtered.map((p) => (p.danh_gia_id ? `dg-${p.danh_gia_id}` : manualGroupKey(p))))
    const dat = filtered.filter((p) => (p.danh_gia ? p.danh_gia.pct : pctFromKetQua(p.ket_qua)) >= 60)
    return {
      luot: luotIds.size,
      dat: dat.length,
      khdat: filtered.length - dat.length,
      total: filtered.length,
    }
  }, [filtered])

  // Gom anh theo luot: luot tu Bang kiem (danh_gia_id) hoac luot gui thu cong (manualGroupKey)
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { type: 'eval' | 'manual'; dg?: PhotoGallery['danh_gia']; manual?: PhotoGallery; list: PhotoGallery[] }
    >()
    for (const p of filtered) {
      const key = p.danh_gia_id ? `dg-${p.danh_gia_id}` : manualGroupKey(p)
      if (!map.has(key)) {
        map.set(key, p.danh_gia_id ? { type: 'eval', dg: p.danh_gia, list: [] } : { type: 'manual', manual: p, list: [] })
      }
      map.get(key)!.list.push(p)
    }
    return [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => {
        const da = a.dg?.ngay_danh_gia || a.manual?.ngay_chup || ''
        const db = b.dg?.ngay_danh_gia || b.manual?.ngay_chup || ''
        return db.localeCompare(da)
      })
  }, [filtered])

  // -- Them anh moi --
  function openAdd() {
    setFormError(null)
    setForm(emptyForm(user?.id ?? ''))
  }

  function openEdit(list: PhotoGallery[]) {
    const first = list[0]
    setFormError(null)
    setForm({
      editKey: manualGroupKey(first),
      editIds: list.map((p) => p.id),
      khoa_id: first.khoa_id ?? '',
      vitri_type_id: first.vitri_type_id ?? '',
      ngay_chup: first.ngay_chup || todayStr(),
      nguoi_gui_id: first.nguoi_gui_id ?? '',
      ket_qua: first.ket_qua || '',
      ghi_chu: first.ghi_chu || '',
      existingPhotos: list,
      newFiles: [],
    })
  }

  function removeExistingPhoto(id: number) {
    setForm((f) => (f ? { ...f, existingPhotos: f.existingPhotos.filter((p) => p.id !== id) } : f))
  }

  function addFiles(files: FileList | null) {
    if (!files || !form) return
    setForm({ ...form, newFiles: [...form.newFiles, ...Array.from(files)] })
  }

  function removeNewFile(idx: number) {
    setForm((f) => (f ? { ...f, newFiles: f.newFiles.filter((_, i) => i !== idx) } : f))
  }

  async function handleSubmit() {
    if (!form) return
    if (form.khoa_id === '') return setFormError('Vui lòng chọn khoa/phòng!')
    if (!form.ket_qua) return setFormError('Vui lòng chọn kết quả (Đạt tốt / Đạt / Chưa đạt)!')
    const totalPhotos = form.existingPhotos.length + form.newFiles.length
    if (totalPhotos === 0) return setFormError('Vui lòng chọn ít nhất 1 ảnh!')

    setSaving(true)
    setFormError(null)
    try {
      const meta = {
        khoa_id: Number(form.khoa_id),
        vitri_type_id: form.vitri_type_id === '' ? null : Number(form.vitri_type_id),
        ngay_chup: form.ngay_chup || null,
        nguoi_gui_id: form.nguoi_gui_id === '' ? null : Number(form.nguoi_gui_id),
        ket_qua: form.ket_qua,
        ghi_chu: form.ghi_chu.trim() || null,
      }

      // Cap nhat metadata cho cac anh cu giu lai (khi sua 1 luot gui da co)
      if (form.editIds) {
        const keepIds = new Set(form.existingPhotos.map((p) => p.id))
        for (const id of form.editIds) {
          if (keepIds.has(id)) {
            setSaveProgress('Đang cập nhật thông tin...')
            await updatePhotoGallery({ id, ...meta })
          } else {
            setSaveProgress('Đang xoá ảnh đã gỡ...')
            await deletePhotoGallery(id)
          }
        }
      }

      // Upload + tao ban ghi cho anh moi chon them
      for (let i = 0; i < form.newFiles.length; i++) {
        const f = form.newFiles[i]
        setSaveProgress(`Đang tải ảnh ${i + 1}/${form.newFiles.length}...`)
        const { url } = await uploadImage(f)
        if (!url) throw new Error(`Tải ảnh "${f.name}" thất bại`)
        await createPhotoGallery({ ...meta, url_anh: url, ten_file: f.name, mime_type: f.type })
      }

      setForm(null)
      setSaveProgress('')
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lưu thất bại!')
    } finally {
      setSaving(false)
      setSaveProgress('')
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await Promise.all(deleting.ids.map((id) => deletePhotoGallery(id)))
      setDeleting(null)
      // Neu anh vua xoa nam trong lightbox dang mo, dong lightbox luon (tranh slider
      // lech state voi danh sach anh da bi rut bot).
      if (previewList && previewList.some((p) => deleting.ids.includes(p.id))) closePreview()
      load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Xoá thất bại!')
    } finally {
      setDeleteBusy(false)
    }
  }

  async function handleExportPpt() {
    setExportError(null)
    setExporting(true)
    try {
      const records: Anh5SPptRecord[] = groups.map((g) => {
        const dg = g.dg
        const manual = g.manual
        const pct = dg ? dg.pct : pctFromKetQua(manual?.ket_qua ?? null)
        const tagLabel = dg ? dg.xep_loai : manual?.ket_qua || ''
        return {
          khoa: dg?.khoa?.ten_khoa || manual?.khoa?.ten_khoa || 'Không rõ',
          vitri: dg?.vitri_type?.ten_vitri || manual?.vitri_type?.ten_vitri || '—',
          ngay: dg?.ngay_danh_gia || manual?.ngay_chup || '',
          nguoi: dg?.nguoi_danh_gia?.username || manual?.nguoi_gui?.username || '',
          pct,
          tagLabel,
          photos: g.list.filter((p) => p.url_anh).map((p) => ({ url: p.url_anh, name: p.ten_file || '' })),
        }
      })
      const rangeLabel = fFrom || fTo ? `${fFrom || '...'} → ${fTo || '...'}` : 'Toàn bộ dữ liệu'
      await exportAnh5SPpt(records, rangeLabel)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Xuất PPTX thất bại!')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={<Camera size={22} />}
        title="Ảnh 5S — minh chứng đánh giá"
        subtitle="Ảnh chụp kèm khi đánh giá Bảng kiểm, hoặc gửi nhanh độc lập tại đây"
        actions={
          <div className="flex gap-2">
            <button className={btnSecondary} disabled={exporting || groups.length === 0} onClick={handleExportPpt} title="Xuất báo cáo PowerPoint">
              <FileBarChart size={15} /> {exporting ? 'Đang xuất...' : 'Xuất PPTX'}
            </button>
            <button className={btnPrimary} onClick={openAdd}>
              <Plus size={15} /> Thêm ảnh
            </button>
          </div>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}
      {exportError && <ErrorBanner message={exportError} onRetry={handleExportPpt} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="📷 Lượt có ảnh" value={kpi.luot} accent="navy" />
        <KpiCard label="✅ Ảnh thuộc lượt Đạt (≥60%)" value={kpi.dat} accent="green" />
        <KpiCard label="❌ Ảnh thuộc lượt Chưa đạt" value={kpi.khdat} accent="red" />
        <KpiCard label="🖼 Tổng ảnh" value={kpi.total} accent="yellow" />
      </div>

      {/* -- Bo loc -- */}
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
          <SearchableSelect
            value={fKhoa}
            onChange={(v) => setFKhoa(v)}
            options={khoaList.map((k) => ({ value: String(k.id), label: k.ten_khoa }))}
            placeholder="— Tất cả —"
          />
        </Field>
        <Field label="Nhân viên">
          <SearchableSelect
            value={fNguoi}
            onChange={(v) => setFNguoi(v)}
            options={users.map((u) => ({ value: String(u.id), label: u.username }))}
            placeholder="— Tất cả —"
          />
        </Field>
        <button className={btnSecondary} onClick={() => { setFKhoa(''); setFLoai(''); setFFrom(''); setFTo(''); setFNguoi('') }}>
          ↺ Đặt lại
        </button>
      </div>

      {loading ? (
        <LoadingRow />
      ) : groups.length === 0 ? (
        <EmptyState icon={<Camera size={36} />} message="Chưa có ảnh minh chứng — bấm 'Thêm ảnh' hoặc tải ảnh khi lưu Bảng kiểm" />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const dg = g.dg
            const manual = g.manual
            const pct = dg ? dg.pct : pctFromKetQua(manual?.ket_qua ?? null)
            return (
              <div key={g.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {dg?.khoa?.ten_khoa || manual?.khoa?.ten_khoa || `Lượt #${g.list[0].id}`}
                    </p>
                    <span className="text-xs text-gray-400">
                      {dg
                        ? `${dg.vitri_type?.ten_vitri} · ${dg.ngay_danh_gia && new Date(dg.ngay_danh_gia).toLocaleDateString('vi-VN')} · ${dg.dot_danh_gia}`
                        : `${manual?.vitri_type?.ten_vitri || 'Không rõ vị trí'} · ${manual?.ngay_chup ? new Date(manual.ngay_chup).toLocaleDateString('vi-VN') : ''} · ${manual?.nguoi_gui?.username || ''}`}
                    </span>
                    {g.type === 'manual' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Gửi thủ công
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneBadgeClass[toneFromPct(pct)]}`}>
                      {dg ? `${dg.pct}% · ${dg.xep_loai}` : manual?.ket_qua}
                    </span>
                    {g.type === 'manual' && (
                      <div className="flex gap-1.5">
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                          title="Sửa lượt gửi này"
                          onClick={() => openEdit(g.list)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                          title="Xoá cả lượt gửi này"
                          onClick={() =>
                            setDeleting({
                              ids: g.list.map((p) => p.id),
                              label: `cả lượt gửi (${g.list.length} ảnh) của ${manual?.khoa?.ten_khoa || ''}`,
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {manual?.ghi_chu && (
                  <p className="flex items-center gap-1.5 border-b border-gray-50 px-5 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <FileText size={12} /> {manual.ghi_chu}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 xl:grid-cols-6">
                  {g.list.map((p, pIdx) => (
                    <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                      <button onClick={() => openPreview(g.list, pIdx)} className="block h-full w-full">
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
                      <button
                        title="Xoá ảnh này"
                        onClick={() => setDeleting({ ids: [p.id], label: 'ảnh này' })}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* -- Lightbox: truot qua lai nhieu anh cung 1 luot gui bang react-slick -- */}
      {previewList && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6" onClick={closePreview}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closePreview}
              title="Đóng (Esc)"
              className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg transition hover:bg-gray-100"
            >
              <X size={18} />
            </button>

            {previewList.length > 1 ? (
              <Slider
                initialSlide={previewIndex}
                afterChange={(idx: number) => setPreviewIndex(idx)}
                dots
                infinite={false}
                speed={300}
                adaptiveHeight
                prevArrow={<SliderArrow dir="prev" />}
                nextArrow={<SliderArrow dir="next" />}
              >
                {previewList.map((p) => (
                  <div key={p.id} className="flex items-center justify-center outline-none">
                    <img src={p.url_anh} alt={p.ten_file || ''} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
                  </div>
                ))}
              </Slider>
            ) : (
              <img src={preview.url_anh} alt={preview.ten_file || ''} className="mx-auto max-h-[70vh] rounded-xl object-contain" />
            )}

            <div className="mt-3 flex items-center justify-between text-sm text-white/80">
              <span>
                {(preview.danh_gia?.khoa?.ten_khoa || preview.khoa?.ten_khoa)} · {preview.ten_file}
                {previewList.length > 1 && ` · Ảnh ${previewIndex + 1}/${previewList.length}`}
              </span>
              <div className="flex items-center gap-2">
                <a href={preview.url_anh} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">
                  <Download size={13} /> Mở ảnh gốc
                </a>
                <button
                  onClick={() => setDeleting({ ids: [preview.id], label: 'ảnh này' })}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-500/80 px-3 py-1.5 text-xs text-white hover:bg-red-500"
                >
                  <Trash2 size={13} /> Xoá ảnh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Modal them / sua anh -- */}
      <Modal
        open={!!form}
        title={form?.editIds ? 'Sửa lượt gửi ảnh' : 'Thêm ảnh 5S'}
        onClose={() => !saving && setForm(null)}
        wide
        footer={
          <>
            <button className={btnSecondary} disabled={saving} onClick={() => setForm(null)}>Huỷ</button>
            <button className={btnPrimary} disabled={saving} onClick={handleSubmit}>
              <Check size={14} /> {saving ? saveProgress || 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {formError && (
              <div className="sm:col-span-2">
                <ErrorBanner message={formError} />
              </div>
            )}
            <Field label="Khoa / Phòng *">
              <SearchableSelect
                value={form.khoa_id}
                onChange={(v) => setForm({ ...form, khoa_id: v })}
                options={khoaList.map((k) => ({ value: k.id, label: k.ten_khoa }))}
                placeholder="— Chọn khoa —"
              />
            </Field>
            <Field label="Vị trí đánh giá">
              <SearchableSelect
                value={form.vitri_type_id}
                onChange={(v) => setForm({ ...form, vitri_type_id: v })}
                options={vitriTypes.map((v) => ({ value: v.id, label: v.ten_vitri }))}
                placeholder="— Không chọn —"
              />
            </Field>
            <Field label="Ngày chụp">
              <input type="date" className={inputCls} value={form.ngay_chup} onChange={(e) => setForm({ ...form, ngay_chup: e.target.value })} />
            </Field>
            <Field label="Người gửi">
              <SearchableSelect
                value={form.nguoi_gui_id}
                onChange={(v) => setForm({ ...form, nguoi_gui_id: v })}
                options={users.map((u) => ({ value: u.id, label: u.username }))}
                placeholder="— Không chọn —"
              />
            </Field>
            <Field label="Kết quả đánh giá *" className="sm:col-span-2">
              <div className="flex gap-2">
                {KET_QUA_ANH_OPTIONS.map((kq) => (
                  <button
                    key={kq}
                    type="button"
                    onClick={() => setForm({ ...form, ket_qua: kq })}
                    className={`h-9 flex-1 rounded-lg border text-sm font-medium transition ${
                      form.ket_qua === kq
                        ? kq === 'Chưa đạt'
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {kq === 'Chưa đạt' ? '❌' : '✅'} {kq}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Ghi chú" className="sm:col-span-2">
              <input className={inputCls} value={form.ghi_chu} onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })} placeholder="Ghi chú thêm (không bắt buộc)..." />
            </Field>

            <Field label={`Ảnh (${form.existingPhotos.length + form.newFiles.length})`} className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {form.existingPhotos.map((p) => (
                  <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <img src={p.url_anh} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeExistingPhoto(p.id)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {form.newFiles.map((f, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-brand-200 dark:border-brand-500/30">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeNewFile(i)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-gray-700">
                  <Upload size={16} />
                  <span className="text-[10px]">Chọn ảnh</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                </label>
              </div>
            </Field>
          </div>
        )}
      </Modal>

      {/* -- Modal canh bao xoa -- */}
      <Modal
        open={!!deleting}
        title="Xoá ảnh — cần xác nhận"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setDeleting(null)}>Huỷ</button>
            <button className={btnDanger} disabled={deleteBusy} onClick={handleDelete}>
              <Trash2 size={14} /> {deleteBusy ? 'Đang xoá...' : 'Tôi chắc chắn, xoá'}
            </button>
          </>
        }
      >
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Bạn sắp xoá <b>{deleting?.label}</b>. Ảnh minh chứng đã xoá sẽ không còn hiển thị trong báo cáo/thư viện
            ảnh 5S. Bạn có chắc chắn muốn xoá?
          </p>
        </div>
        {deleteError && (
          <div className="mt-3">
            <ErrorBanner message={deleteError} />
          </div>
        )}
      </Modal>
    </div>
  )
}
