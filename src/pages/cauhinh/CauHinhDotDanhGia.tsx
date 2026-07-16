import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, Plus, Pencil, Trash2, Check, Lock, LockOpen } from 'lucide-react'
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
} from '../../components/ui/PageShell'
import { fetchDotDanhGiaList, createUpdateDotDanhGia, deleteDotDanhGia } from '../../features/qlcl/api'
import type { DotDanhGia } from '../../features/qlcl/types'

interface FormState {
  id?: number
  ten_dot: string
  tu_ngay: string
  den_ngay: string
  mo_ta: string
  trang_thai: string
}

const emptyForm: FormState = { ten_dot: '', tu_ngay: '', den_ngay: '', mo_ta: '', trang_thai: 'dang-mo' }

const fmtDate = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—')

// Mục 3: Cấu hình đợt đánh giá (bảng dot_danh_gia) — map.jpg "Cấu hình tạo đợt đánh giá"
export default function CauHinhDotDanhGia() {
  const [rows, setRows] = useState<DotDanhGia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<DotDanhGia | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchDotDanhGiaList()
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được danh sách đợt đánh giá'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const kpi = useMemo(
    () => ({
      total: rows.length,
      dangMo: rows.filter((r) => r.trang_thai === 'dang-mo').length,
      daDong: rows.filter((r) => r.trang_thai === 'da-dong').length,
    }),
    [rows],
  )

  async function handleSubmit() {
    if (!form) return
    if (!form.ten_dot.trim()) return setFormError('Vui lòng nhập tên đợt đánh giá!')
    if (form.tu_ngay && form.den_ngay && form.tu_ngay > form.den_ngay)
      return setFormError('Ngày bắt đầu không được sau ngày kết thúc!')
    setSaving(true)
    setFormError(null)
    try {
      await createUpdateDotDanhGia({
        id: form.id,
        ten_dot: form.ten_dot.trim(),
        tu_ngay: form.tu_ngay || null,
        den_ngay: form.den_ngay || null,
        mo_ta: form.mo_ta.trim() || null,
        trang_thai: form.trang_thai,
      })
      setForm(null)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lưu thất bại!')
    } finally {
      setSaving(false)
    }
  }

  // Mở/đóng nhanh 1 đợt ngay trên bảng
  async function toggleTrangThai(r: DotDanhGia) {
    setTogglingId(r.id)
    try {
      await createUpdateDotDanhGia({
        id: r.id,
        ten_dot: r.ten_dot,
        trang_thai: r.trang_thai === 'dang-mo' ? 'da-dong' : 'dang-mo',
      })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được trạng thái!')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteDotDanhGia(deleting.id)
      setDeleting(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xoá thất bại!')
      setDeleting(null)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={<CalendarRange size={22} />}
        title="Cấu hình đợt đánh giá"
        subtitle="Tạo và quản lý các đợt đánh giá 5S — Bảng kiểm sẽ cho chọn các đợt đang mở"
        actions={
          <button
            className={btnPrimary}
            onClick={() => {
              setFormError(null)
              setForm({ ...emptyForm })
            }}
          >
            <Plus size={15} /> Tạo đợt đánh giá
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-3 gap-3">
        <KpiCard label="Tổng số đợt" value={kpi.total} accent="navy" />
        <KpiCard label="Đang mở" value={kpi.dangMo} accent="green" />
        <KpiCard label="Đã đóng" value={kpi.daDong} accent="yellow" />
      </div>

      {loading ? (
        <LoadingRow text="Đang tải danh sách đợt đánh giá..." />
      ) : rows.length === 0 ? (
        <EmptyState icon={<CalendarRange size={28} />} message="Chưa có đợt đánh giá nào. Bấm 'Tạo đợt đánh giá' để bắt đầu." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Tên đợt</th>
                  <th className="px-4 py-3 font-medium">Từ ngày</th>
                  <th className="px-4 py-3 font-medium">Đến ngày</th>
                  <th className="px-4 py-3 font-medium">Mô tả</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const open = r.trang_thai === 'dang-mo'
                  return (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{r.ten_dot}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.tu_ngay)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{fmtDate(r.den_ngay)}</td>
                      <td className="max-w-56 truncate px-4 py-3 text-gray-500 dark:text-gray-400" title={r.mo_ta || ''}>{r.mo_ta || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            open
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
                              : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20'
                          }`}
                        >
                          {open ? <LockOpen size={11} /> : <Lock size={11} />}
                          {open ? 'Đang mở' : 'Đã đóng'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-amber-300 hover:text-amber-500 disabled:opacity-40 dark:border-gray-700"
                            title={open ? 'Đóng đợt' : 'Mở lại đợt'}
                            disabled={togglingId === r.id}
                            onClick={() => toggleTrangThai(r)}
                          >
                            {open ? <Lock size={14} /> : <LockOpen size={14} />}
                          </button>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                            title="Sửa"
                            onClick={() => {
                              setFormError(null)
                              setForm({
                                id: r.id,
                                ten_dot: r.ten_dot,
                                tu_ngay: r.tu_ngay || '',
                                den_ngay: r.den_ngay || '',
                                mo_ta: r.mo_ta || '',
                                trang_thai: r.trang_thai,
                              })
                            }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                            title="Xoá"
                            onClick={() => setDeleting(r)}
                          >
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
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        💡 Khi làm Bảng kiểm, ô "Đợt đánh giá" sẽ hiện các đợt <b>đang mở</b>. Đóng đợt để không cho chấm thêm vào đợt đó.
      </p>

      {/* Modal tạo / sửa đợt */}
      <Modal
        open={!!form}
        title={form?.id ? `Sửa đợt — ${form.ten_dot}` : 'Tạo đợt đánh giá mới'}
        onClose={() => setForm(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setForm(null)}>Huỷ</button>
            <button className={btnPrimary} disabled={saving} onClick={handleSubmit}>
              <Check size={14} /> {saving ? 'Đang lưu...' : form?.id ? 'Lưu thay đổi' : 'Tạo đợt'}
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
            <Field label="Tên đợt *" className="sm:col-span-2">
              <input
                className={inputCls}
                value={form.ten_dot}
                onChange={(e) => setForm({ ...form, ten_dot: e.target.value })}
                placeholder="VD: Đợt 1 - Quý 3/2026, Định kỳ tháng 7/2026..."
              />
            </Field>
            <Field label="Từ ngày">
              <input
                type="date"
                className={inputCls}
                value={form.tu_ngay}
                max={form.den_ngay || undefined}
                onChange={(e) => setForm({ ...form, tu_ngay: e.target.value })}
              />
            </Field>
            <Field label="Đến ngày">
              <input
                type="date"
                className={inputCls}
                value={form.den_ngay}
                min={form.tu_ngay || undefined}
                onChange={(e) => setForm({ ...form, den_ngay: e.target.value })}
              />
            </Field>
            <Field label="Mô tả" className="sm:col-span-2">
              <input className={inputCls} value={form.mo_ta} onChange={(e) => setForm({ ...form, mo_ta: e.target.value })} placeholder="Ghi chú về đợt đánh giá..." />
            </Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={form.trang_thai} onChange={(e) => setForm({ ...form, trang_thai: e.target.value })}>
                <option value="dang-mo">Đang mở</option>
                <option value="da-dong">Đã đóng</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Confirm xoá */}
      <Modal
        open={!!deleting}
        title="Xoá đợt đánh giá"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setDeleting(null)}>Huỷ</button>
            <button className={btnDanger} disabled={deleteBusy} onClick={handleDelete}>
              <Trash2 size={14} /> {deleteBusy ? 'Đang xoá...' : 'Xoá đợt'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn chắc chắn muốn xoá đợt <b>{deleting?.ten_dot}</b>? Các lượt đánh giá đã chấm
          trong đợt này vẫn được giữ nguyên trong dữ liệu.
        </p>
      </Modal>
    </div>
  )
}
