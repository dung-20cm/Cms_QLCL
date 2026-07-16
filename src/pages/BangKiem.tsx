import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Check, X, RotateCcw, Save, Camera } from 'lucide-react'
import { useAppSelector } from '../app/hooks'
import {
  PageHeader,
  Field,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  useCatalog,
} from '../components/ui/PageShell'
import SearchableSelect from '../components/ui/SearchableSelect'
import {
  fetchChecklistItems,
  fetchDotDanhGiaList,
  createDanhGia,
  uploadImage,
  createPhotoGallery,
} from '../features/qlcl/api'
import type { DotDanhGia } from '../features/qlcl/types'
import type { ChecklistItem, DanhGia } from '../features/qlcl/types'
import { DOT_DANH_GIA_OPTIONS, xepLoaiFromPct, toneBadgeClass } from '../features/qlcl/types'
import { useKhoaViTri } from '../features/qlcl/useKhoaViTri'

type KetQua = 0 | 1 | null

interface SGroup {
  s_id: string
  s_name: string
  s_color: string
  s_lt: string
  items: ChecklistItem[]
}

function groupByS(items: ChecklistItem[]): SGroup[] {
  const map = new Map<string, SGroup>()
  for (const it of items) {
    if (!map.has(it.s_id)) {
      map.set(it.s_id, { s_id: it.s_id, s_name: it.s_name, s_color: it.s_color, s_lt: it.s_lt, items: [] })
    }
    map.get(it.s_id)!.items.push(it)
  }
  return [...map.values()]
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function BangKiem() {
  const { khoaList, vitriTypes, users, status: catalogStatus, error: catalogError } = useCatalog()
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()

  // Đồng đánh giá — cán bộ CÙNG tham gia chấm bảng kiểm này, ngoài người đang
  // đăng nhập (luôn là người đánh giá chính). Chỉ được chọn cán bộ CÙNG khoa/
  // phòng với tài khoản đang đăng nhập (khớp file mẫu: cho chọn nhiều người
  // cùng đánh giá, nhưng giới hạn trong phạm vi khoa/phòng của mình).
  const [dongDanhGiaIds, setDongDanhGiaIds] = useState<number[]>([])
  const dongDanhGiaOptions = useMemo(
    () => users.filter((u) => u.khoa_id === user?.khoa_id && u.id !== user?.id),
    [users, user?.khoa_id, user?.id],
  )

  // ── Thông tin đánh giá ──
  const [khoaId, setKhoaId] = useState<number | ''>('')
  const [vitriTypeId, setVitriTypeId] = useState<number | ''>('')
  const [viTriChiTiet, setViTriChiTiet] = useState('') // nhập tay (khoa chưa cấu hình mã chi tiết)
  const [viTriChiTietIds, setViTriChiTietIds] = useState<number[]>([]) // chọn nhiều từ mã đã cấu hình
  const [ngay, setNgay] = useState(todayStr())
  const [dot, setDot] = useState(DOT_DANH_GIA_OPTIONS[2]) // Định kỳ

  // Đợt đánh giá đang mở (Cấu hình > mục 3); không có đợt nào => fallback options tĩnh
  const [dotList, setDotList] = useState<DotDanhGia[]>([])
  useEffect(() => {
    fetchDotDanhGiaList({ trang_thai: 'dang-mo' })
      .then((res) => {
        setDotList(res.rows)
        if (res.rows.length > 0) setDot(res.rows[0].ten_dot)
      })
      .catch(() => setDotList([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const dotOptions = dotList.length > 0 ? dotList.map((d) => d.ten_dot) : DOT_DANH_GIA_OPTIONS

  // Vị trí hiển thị theo cấu hình khoa (trang Cấu hình > mục 1)
  const { types: configTypes, maByType, hasConfig } = useKhoaViTri(khoaId)

  // ── Bảng kiểm ──
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [ketQua, setKetQua] = useState<Record<number, KetQua>>({})
  const [ghiChu, setGhiChu] = useState<Record<number, string>>({})

  // ── Lưu ──
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState<DanhGia | null>(null)

  // ── Ảnh minh chứng ──
  const [photos, setPhotos] = useState<File[]>([])
  const [photoStatus, setPhotoStatus] = useState('')

  // User thường: mặc định khoa của mình
  useEffect(() => {
    if (user?.khoa_id && khoaId === '') setKhoaId(user.khoa_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Giống 5S_Dashboard_BVTB_v4.html: mặc định hiển thị luôn bảng kiểm của
  // vị trí đầu tiên thay vì chờ người dùng chọn. Nếu khoa có cấu hình thì chỉ
  // hiện các vị trí đã tick trong Cấu hình; đổi khoa mà vị trí đang chọn không
  // thuộc cấu hình mới => tự nhảy về vị trí đầu tiên hợp lệ.
  useEffect(() => {
    if (configTypes.length === 0) return
    const valid = configTypes.some((v) => v.id === vitriTypeId)
    if (vitriTypeId === '' || !valid) {
      setVitriTypeId(configTypes[0].id)
      setViTriChiTietIds([])
      setViTriChiTiet('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configTypes])

  // Đổi vị trí => reset lựa chọn mã chi tiết
  useEffect(() => {
    setViTriChiTietIds([])
  }, [vitriTypeId])

  // Đổi vị trí → nạp bảng kiểm tương ứng từ API
  useEffect(() => {
    if (vitriTypeId === '') {
      setItems([])
      return
    }
    let cancelled = false
    setLoadingItems(true)
    fetchChecklistItems(Number(vitriTypeId))
      .then((res) => {
        if (cancelled) return
        setItems([...res.rows].sort((a, b) => a.thu_tu - b.thu_tu))
        setKetQua({})
        setGhiChu({})
        setSaved(null)
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoadingItems(false))
    return () => {
      cancelled = true
    }
  }, [vitriTypeId])

  const groups = useMemo(() => groupByS(items), [items])

  const stats = useMemo(() => {
    const tong = items.length
    let dat = 0
    let danhGiaXong = 0
    for (const it of items) {
      const kq = ketQua[it.id]
      if (kq !== null && kq !== undefined) danhGiaXong++
      if (kq === 1) dat++
    }
    const pct = tong ? Math.round((dat / tong) * 100) : 0
    return { tong, dat, danhGiaXong, pct }
  }, [items, ketQua])

  const xl = xepLoaiFromPct(stats.pct)
  const readyToSave = khoaId !== '' && vitriTypeId !== '' && items.length > 0 && stats.danhGiaXong === stats.tong

  function setAll(kq: KetQua) {
    const next: Record<number, KetQua> = {}
    for (const it of items) next[it.id] = kq
    setKetQua(next)
  }

  function resetForm() {
    setKetQua({})
    setGhiChu({})
    setViTriChiTietIds([])
    setDongDanhGiaIds([])
    setSaved(null)
    setSaveError(null)
    setPhotos([])
    setPhotoStatus('')
  }

  async function handleSave() {
    if (!user || khoaId === '' || vitriTypeId === '') return
    setSaving(true)
    setSaveError(null)
    try {
      // Nhãn vị trí chi tiết: từ các mã đã chọn (cấu hình) hoặc text nhập tay
      const selectedMa = (maByType.get(Number(vitriTypeId)) || [])
        .filter((r) => viTriChiTietIds.includes(r.id))
        .map((r) => r.ma_vitri)
      const chiTietLabel = selectedMa.length > 0 ? selectedMa.join(', ') : viTriChiTiet
      const rec = await createDanhGia({
        khoa_id: Number(khoaId),
        vitri_type_id: Number(vitriTypeId),
        // chọn đúng 1 mã cấu hình => lưu kèm id để trace về vitri_chi_tiet
        vitri_chi_tiet_id: viTriChiTietIds.length === 1 ? viTriChiTietIds[0] : null,
        nguoi_danh_gia_id: user.id,
        dong_danh_gia_ids: dongDanhGiaIds.length ? dongDanhGiaIds.join(',') : null,
        ngay_danh_gia: ngay,
        dot_danh_gia: chiTietLabel ? `${dot} — ${chiTietLabel}` : dot,
        // liên kết đợt cấu hình (bảng dot_danh_gia) nếu đang chọn 1 đợt từ danh sách
        dot_danh_gia_id: dotList.find((d) => d.ten_dot === dot)?.id ?? null,
        chi_tiet: items.map((it) => ({
          checklist_item_id: it.id,
          ket_qua: ketQua[it.id] ?? null,
          ghi_chu: ghiChu[it.id] || undefined,
        })),
      })
      setSaved(rec)

      // Upload ảnh minh chứng (nếu có) gắn vào lượt đánh giá vừa tạo
      if (photos.length > 0 && rec?.id) {
        let ok = 0
        for (const f of photos) {
          try {
            const { url } = await uploadImage(f)
            if (url) {
              await createPhotoGallery({ danh_gia_id: rec.id, url_anh: url, ten_file: f.name, mime_type: f.type })
              ok++
            }
          } catch {
            /* bỏ qua ảnh lỗi, không chặn luồng lưu */
          }
          setPhotoStatus(`Đã tải lên ${ok}/${photos.length} ảnh`)
        }
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Lưu thất bại, vui lòng thử lại!')
    } finally {
      setSaving(false)
    }
  }

  if (catalogStatus === 'loading' || catalogStatus === 'idle') return <LoadingRow />

  return (
    <div>
      <PageHeader
        icon={<ClipboardList size={22} />}
        title="Bảng kiểm đánh giá 5S"
        subtitle="Chọn khoa + vị trí → chấm từng tiêu chí → lưu kết quả về máy chủ"
      />
      {catalogError && <ErrorBanner message={catalogError} />}

      {/* ── Thông tin đánh giá ── */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Khoa / Phòng / Trung tâm">
            <SearchableSelect
              value={khoaId}
              onChange={setKhoaId}
              options={khoaList.map((k) => ({ value: k.id, label: k.ten_khoa }))}
              placeholder="— Chọn khoa —"
            />
          </Field>
          <Field label={`Vị trí đánh giá (chọn → bảng kiểm tự đổi)${khoaId !== '' && hasConfig ? ' — theo cấu hình khoa' : ''}`}>
            <select className={inputCls} value={vitriTypeId} onChange={(e) => setVitriTypeId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Chọn vị trí —</option>
              {configTypes.map((v) => (
                <option key={v.id} value={v.id}>{v.ten_vitri}</option>
              ))}
            </select>
          </Field>
          {vitriTypeId !== '' && (maByType.get(Number(vitriTypeId))?.length ?? 0) > 0 ? (
            <Field label="Vị trí chi tiết (chọn 1 hoặc nhiều — theo cấu hình)">
              <select
                multiple
                className={`${inputCls} h-auto min-h-9 py-1`}
                size={Math.min(maByType.get(Number(vitriTypeId))!.length, 3)}
                value={viTriChiTietIds.map(String)}
                onChange={(e) =>
                  setViTriChiTietIds([...e.target.selectedOptions].map((o) => Number(o.value)))
                }
              >
                {maByType.get(Number(vitriTypeId))!.map((r) => (
                  <option key={r.id} value={r.id}>{r.ma_vitri}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Vị trí chi tiết (buồng số, phòng số...)">
              <input className={inputCls} value={viTriChiTiet} onChange={(e) => setViTriChiTiet(e.target.value)} placeholder="VD: Buồng 3, Phòng mổ 1, Xe số 2..." />
            </Field>
          )}
          <Field label="Người đánh giá (tích chọn thêm đồng nghiệp cùng khoa/phòng nếu cùng đánh giá)">
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
              <span className="inline-flex items-center rounded-full border border-brand-500 bg-brand-500 px-3 py-1 text-xs font-medium text-white">
                {user?.username} <span className="ml-1 font-normal opacity-80">(bạn)</span>
              </span>
              {dongDanhGiaOptions.map((u) => {
                const on = dongDanhGiaIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      setDongDanhGiaIds((prev) =>
                        on ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      on
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {u.email || u.username}
                  </button>
                )
              })}
              {dongDanhGiaOptions.length === 0 && (
                <span className="py-1 text-xs text-gray-400">
                  Không có đồng nghiệp nào khác trong khoa/phòng của bạn
                </span>
              )}
            </div>
          </Field>
          <Field label="Ngày đánh giá">
            <input type="date" className={inputCls} value={ngay} onChange={(e) => setNgay(e.target.value)} />
          </Field>
          <Field label={`Đợt đánh giá${dotList.length > 0 ? ' (các đợt đang mở)' : ''}`}>
            <select className={inputCls} value={dot} onChange={(e) => setDot(e.target.value)}>
              {dotOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* ── Banner vị trí + thao tác nhanh ── */}
      {vitriTypeId !== '' && items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-25 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/5">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
            📍 {vitriTypes.find((v) => v.id === vitriTypeId)?.ten_vitri}
            {(() => {
              const sel = (maByType.get(Number(vitriTypeId)) || [])
                .filter((r) => viTriChiTietIds.includes(r.id))
                .map((r) => r.ma_vitri)
              const label = sel.length > 0 ? sel.join(', ') : viTriChiTiet
              return label ? <span className="text-brand-500"> · {label}</span> : null
            })()}
            <span className="ml-2 text-xs font-normal text-gray-400">{items.length} tiêu chí</span>
          </p>
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={() => setAll(1)}>
              <Check size={15} className="text-emerald-500" /> Tất cả Đạt
            </button>
            <button className={btnSecondary} onClick={() => setAll(null)}>
              <RotateCcw size={15} /> Bỏ chấm
            </button>
          </div>
        </div>
      )}

      {loadingItems && <LoadingRow text="Đang tải bảng kiểm..." />}

      {/* ── 5 nhóm S ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {groups.map((g) => {
          const done = g.items.filter((it) => ketQua[it.id] !== undefined && ketQua[it.id] !== null).length
          const pass = g.items.filter((it) => ketQua[it.id] === 1).length
          return (
            <div key={g.s_id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: g.s_lt }}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: g.s_color }}>
                    {g.s_id}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: g.s_color }}>{g.s_name}</span>
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                  {pass}/{g.items.length} đạt · {done}/{g.items.length} đã chấm
                </span>
              </div>
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {g.items.map((it) => {
                  const kq = ketQua[it.id]
                  return (
                    <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: g.s_color }}>{it.sub}</p>
                        <p className="mt-0.5 text-sm leading-snug text-gray-700 dark:text-gray-300">{it.tc}</p>
                        {kq === 0 && (
                          <input
                            className="mt-2 h-8 w-full rounded-lg border border-red-200 bg-red-50/50 px-2.5 text-xs text-gray-700 outline-none placeholder:text-red-300 focus:border-red-400 dark:border-red-500/30 dark:bg-red-500/5 dark:text-gray-200"
                            placeholder="Ghi chú lỗi (dùng cho khắc phục)..."
                            value={ghiChu[it.id] || ''}
                            onChange={(e) => setGhiChu((p) => ({ ...p, [it.id]: e.target.value }))}
                          />
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5 pt-0.5">
                        <button
                          onClick={() => setKetQua((p) => ({ ...p, [it.id]: p[it.id] === 1 ? null : 1 }))}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            kq === 1
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                              : 'border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-400 dark:border-gray-700'
                          }`}
                          title="Đạt"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setKetQua((p) => ({ ...p, [it.id]: p[it.id] === 0 ? null : 0 }))}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                            kq === 0
                              ? 'border-red-500 bg-red-500 text-white shadow-sm'
                              : 'border-gray-200 text-gray-300 hover:border-red-300 hover:text-red-400 dark:border-gray-700'
                          }`}
                          title="Không đạt"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {/* ── Kết quả + lưu ── */}
      {items.length > 0 && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div>
                <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{stats.pct}%</p>
                <p className="text-xs text-gray-400">{stats.dat}/{stats.tong} tiêu chí đạt · đã chấm {stats.danhGiaXong}/{stats.tong}</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${toneBadgeClass[xl.tone]}`}>{xl.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <label className={btnSecondary}>
                <Camera size={15} />
                Ảnh minh chứng{photos.length > 0 && ` (${photos.length})`}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setPhotos([...photos, ...Array.from(e.target.files || [])])}
                />
              </label>
              <button className={btnPrimary} disabled={!readyToSave || saving || !!saved} onClick={handleSave}>
                <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu kết quả'}
              </button>
            </div>
          </div>

          {/* progress bar */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${stats.pct >= 90 ? 'bg-emerald-500' : stats.pct >= 75 ? 'bg-sky-500' : stats.pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${stats.pct}%` }}
            />
          </div>

          {photoStatus && <p className="mt-2 text-xs text-gray-400">{photoStatus}</p>}
          {!readyToSave && !saved && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Cần chọn khoa, vị trí và chấm đủ {stats.tong} tiêu chí trước khi lưu.
            </p>
          )}
          {saveError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">✗ {saveError}</p>}

          {saved && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                ✓ Đã lưu lượt đánh giá — {saved.pct}% ({saved.xep_loai})
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={btnPrimary} onClick={resetForm}>Đánh giá lượt mới</button>
                <button className={btnSecondary} onClick={() => navigate('/tong-hop')}>Xem tổng hợp</button>
                <button className={btnSecondary} onClick={() => navigate('/tien-do-kp')}>Xem tiến độ khắc phục</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
