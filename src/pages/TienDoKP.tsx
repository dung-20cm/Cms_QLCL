import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wrench, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import {
  PageHeader,
  KpiCard,
  Field,
  Modal,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
} from '../components/ui/PageShell'
import SearchableSelect from '../components/ui/SearchableSelect'
import Pagination, { usePagination } from '../components/ui/Pagination'
import { fetchKhacPhucList, createUpdateKhacPhuc, deleteKhacPhuc } from '../features/qlcl/api'
import type { KhacPhuc } from '../features/qlcl/types'

const TRANG_THAI = ['Chưa bắt đầu', 'Đang xử lý', 'Đã xong']

function ttBadge(tt: string, quaHan: boolean) {
  if (tt === 'Đã xong') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
  if (quaHan) return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
  if (tt === 'Đang xử lý') return 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
}

const isQuaHan = (kp: KhacPhuc) =>
  kp.trang_thai !== 'Đã xong' && !!kp.han_xu_ly && kp.han_xu_ly < new Date().toISOString().slice(0, 10)

// Số ngày còn lại tới hạn xử lý (âm = đã quá hạn bấy nhiêu ngày)
function soNgayConLai(hanXuLy: string | null): number | null {
  if (!hanXuLy) return null
  const han = new Date(`${hanXuLy}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((han.getTime() - today.getTime()) / 86400000)
}

export default function TienDoKP() {
  const { users, khoaList } = useCatalog()
  const [rows, setRows] = useState<KhacPhuc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fTuan, setFTuan] = useState('')
  const [fTT, setFTT] = useState('')
  const [fKhoa, setFKhoa] = useState('')

  // Modal cập nhật
  const [editing, setEditing] = useState<KhacPhuc | null>(null)
  const [mHanhDong, setMHanhDong] = useState('')
  const [mNguoi, setMNguoi] = useState<number | ''>('')
  const [mHan, setMHan] = useState('')
  const [mTT, setMTT] = useState(TRANG_THAI[0])
  const [mGhiChu, setMGhiChu] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchKhacPhucList()
      .then((res) => setRows(res.rows.filter((r) => r.active !== 0)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const tuanOptions = useMemo(
    () => [...new Set(rows.map((r) => r.tuan).filter(Boolean))] as string[],
    [rows],
  )

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (fTuan && r.tuan !== fTuan) return false
        if (fKhoa && String(r.danh_gia_chi_tiet?.danh_gia?.khoa_id) !== fKhoa) return false
        if (fTT === 'Quá hạn') return isQuaHan(r)
        if (fTT && r.trang_thai !== fTT) return false
        return true
      }),
    [rows, fTuan, fTT, fKhoa],
  )

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedRows,
    pageSize,
    totalItems,
  } = usePagination(filtered, { resetKey: `${fTuan}|${fTT}|${fKhoa}` })

  const kpi = useMemo(
    () => ({
      total: filtered.length,
      done: filtered.filter((r) => r.trang_thai === 'Đã xong').length,
      doing: filtered.filter((r) => r.trang_thai === 'Đang xử lý').length,
      over: filtered.filter(isQuaHan).length,
      // Chưa có hành động KP nào ghi nhận, đã phát hiện quá 5 ngày (tính theo ngày tạo)
      chuaKP: filtered.filter((r) => {
        if (r.hanh_dong_khac_phuc?.trim()) return false
        if (r.trang_thai === 'Đã xong') return false
        const created = r.createdAt ? new Date(r.createdAt) : null
        if (!created) return false
        const days = Math.floor((Date.now() - created.getTime()) / 86400000)
        return days >= 5
      }).length,
    }),
    [filtered],
  )

  async function handleDelete(kp: KhacPhuc) {
    if (!window.confirm('Xoá hành động khắc phục này?')) return
    try {
      await deleteKhacPhuc(kp.id)
      setRows((prev) => prev.filter((r) => r.id !== kp.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xoá thất bại')
    }
  }

  function openEdit(kp: KhacPhuc) {
    setEditing(kp)
    setMHanhDong(kp.hanh_dong_khac_phuc || '')
    setMNguoi(kp.nguoi_phu_trach_id ?? '')
    setMHan(kp.han_xu_ly?.slice(0, 10) || '')
    setMTT(kp.trang_thai || TRANG_THAI[0])
    setMGhiChu(kp.ghi_chu || '')
    setModalError(null)
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    setModalError(null)
    try {
      await createUpdateKhacPhuc({
        id: editing.id,
        danh_gia_chi_tiet_id: editing.danh_gia_chi_tiet_id,
        hanh_dong_khac_phuc: mHanhDong,
        nguoi_phu_trach_id: mNguoi === '' ? null : Number(mNguoi),
        han_xu_ly: mHan || null,
        tuan: editing.tuan,
        trang_thai: mTT,
        ghi_chu: mGhiChu || null,
      })
      setEditing(null)
      load()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={<Wrench size={22} />}
        title="Theo dõi tiến độ khắc phục"
        subtitle="Tổng hợp lỗi phát hiện qua đánh giá — cập nhật tiến độ khắc phục hàng tuần"
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard label="Tổng hành động" value={kpi.total} accent="navy" />
        <KpiCard label="Đã xong" value={kpi.done} accent="green" />
        <KpiCard label="Đang xử lý" value={kpi.doing} accent="blue" />
        <KpiCard label="⚠ Quá hạn" value={kpi.over} sub="cần xử lý ngay" accent="red" />
        <KpiCard label="⚠ Chưa KP ≥5 ngày" value={kpi.chuaKP} sub="cần xử lý ngay" accent="yellow" />
      </div>

      {/* ── Bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Tuần">
          <select className={inputCls} value={fTuan} onChange={(e) => setFTuan(e.target.value)}>
            <option value="">— Tất cả tuần —</option>
            {tuanOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Khoa / Phòng" className="min-w-[220px]">
          <SearchableSelect
            value={fKhoa}
            onChange={(v) => setFKhoa(v)}
            options={khoaList.map((k) => ({ value: String(k.id), label: k.ten_khoa }))}
            placeholder="— Tất cả khoa —"
          />
        </Field>
        <Field label="Trạng thái">
          <select className={inputCls} value={fTT} onChange={(e) => setFTT(e.target.value)}>
            <option value="">— Tất cả —</option>
            {TRANG_THAI.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option>Quá hạn</option>
          </select>
        </Field>
        <button className={btnSecondary} onClick={() => { setFTuan(''); setFTT(''); setFKhoa('') }}>
          <RotateCcw size={14} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">
          Hành động KP được tạo tự động cho mọi tiêu chí ✗ khi lưu Bảng kiểm
        </span>
      </div>

      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Wrench size={36} />} message="Chưa có hành động khắc phục nào" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Khoa / Vị trí / Tiêu chí lỗi</th>
                  <th className="px-4 py-3 font-medium">Hành động khắc phục</th>
                  <th className="px-4 py-3 font-medium">Người phụ trách</th>
                  <th className="px-4 py-3 font-medium">Hạn xử lý</th>
                  <th className="px-4 py-3 font-medium">Tiến độ</th>
                  <th className="px-4 py-3 font-medium">Tuần</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => {
                  const dgct = r.danh_gia_chi_tiet
                  const dg = dgct?.danh_gia
                  const quaHan = isQuaHan(r)
                  const conLai = soNgayConLai(r.han_xu_ly)
                  return (
                    <tr key={r.id} className="border-b border-gray-50 align-top last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40">
                      <td className="max-w-[280px] px-5 py-3">
                        <p className="font-medium text-gray-700 dark:text-gray-200">{dg?.khoa?.ten_khoa || '—'}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {dg?.vitri_type?.ten_vitri}
                          {dgct?.checklist_item && (
                            <span className="ml-1 rounded px-1 py-0.5 text-[10px] font-semibold" style={{ background: dgct.checklist_item.s_lt, color: dgct.checklist_item.s_color }}>
                              {dgct.checklist_item.s_id} · {dgct.checklist_item.sub}
                            </span>
                          )}
                        </p>
                        {dgct?.checklist_item?.tc && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{dgct.checklist_item.tc}</p>
                        )}
                        {dgct?.ghi_chu && <p className="mt-1 text-xs italic text-red-400">Lỗi: {dgct.ghi_chu}</p>}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-gray-600 dark:text-gray-300">{r.hanh_dong_khac_phuc}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.nguoi_phu_trach?.username || '—'}</td>
                      <td className={`px-4 py-3 ${quaHan ? 'font-semibold text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {r.han_xu_ly ? new Date(r.han_xu_ly).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.trang_thai === 'Đã xong' ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Đã hoàn thành</span>
                        ) : conLai == null ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <span className={`text-xs font-semibold ${conLai < 0 ? 'text-red-500' : conLai <= 2 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {conLai < 0 ? `Quá hạn ${Math.abs(conLai)} ngày` : conLai === 0 ? 'Hết hạn hôm nay' : `Còn ${conLai} ngày`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.tuan}</td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ttBadge(r.trang_thai, quaHan)}`}>
                          {quaHan ? `⚠ Quá hạn` : r.trang_thai}
                        </span>
                        {r.ghi_chu && <p className="mt-1 max-w-[160px] truncate text-[11px] text-gray-400">{r.ghi_chu}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(r)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700" title="Cập nhật tiến độ">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(r)} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700" title="Xoá hành động">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* ── Modal cập nhật ── */}
      <Modal
        open={!!editing}
        title="Cập nhật hành động khắc phục"
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setEditing(null)}>Huỷ</button>
            <button className={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </>
        }
      >
        <div className="grid gap-4">
          {editing?.danh_gia_chi_tiet?.checklist_item && (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <span className="font-semibold">{editing.danh_gia_chi_tiet.checklist_item.s_id}</span> · {editing.danh_gia_chi_tiet.checklist_item.tc}
            </div>
          )}
          <Field label="Hành động khắc phục">
            <textarea
              className={`${inputCls} h-24 resize-y py-2`}
              value={mHanhDong}
              onChange={(e) => setMHanhDong(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Người phụ trách">
              <select className={inputCls} value={mNguoi} onChange={(e) => setMNguoi(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— Chưa gán —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </Field>
            <Field label="Hạn xử lý">
              <input type="date" className={inputCls} value={mHan} onChange={(e) => setMHan(e.target.value)} />
            </Field>
          </div>
          <Field label="Trạng thái">
            <div className="flex gap-2">
              {TRANG_THAI.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMTT(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    mTT === t
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Ghi chú cập nhật">
            <textarea className={`${inputCls} h-20 resize-y py-2`} value={mGhiChu} onChange={(e) => setMGhiChu(e.target.value)} placeholder="Tiến độ cụ thể, kết quả..." />
          </Field>
          {modalError && <p className="text-sm text-red-600 dark:text-red-400">✗ {modalError}</p>}
        </div>
      </Modal>
    </div>
  )
}
