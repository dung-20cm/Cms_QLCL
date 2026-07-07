import { useCallback, useEffect, useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  PageHeader,
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
import { fetchVitriTypeList, createUpdateVitriType, deleteVitriType } from '../../features/qlcl/api'
import type { VitriType } from '../../features/qlcl/types'
import { useAppDispatch } from '../../app/hooks'
import { loadCatalog } from '../../features/qlcl/catalogSlice'

// Mục 2: CRUD danh mục vị trí đánh giá (vitri_type)
export default function CauHinhViTri() {
  const dispatch = useAppDispatch()

  const [vitriTypes, setVitriTypes] = useState<VitriType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<{ id?: number; ten_vitri: string; thu_tu: number } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<VitriType | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchVitriTypeList()
      .then((res) => setVitriTypes([...res.rows].filter((v) => v.active !== 0).sort((a, b) => a.thu_tu - b.thu_tu)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được danh sách vị trí'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function handleSubmit() {
    if (!form) return
    if (!form.ten_vitri.trim()) return setFormError('Vui lòng nhập tên vị trí!')
    setSaving(true)
    setFormError(null)
    try {
      await createUpdateVitriType({ id: form.id, ten_vitri: form.ten_vitri.trim(), thu_tu: form.thu_tu })
      setForm(null)
      load()
      dispatch(loadCatalog()) // refresh cache dùng chung (Bảng kiểm, filter...)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lưu thất bại!')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteVitriType(deleting.id)
      setDeleting(null)
      load()
      dispatch(loadCatalog())
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
        icon={<MapPin size={22} />}
        title="Quản lý vị trí đánh giá"
        subtitle="Danh mục các loại vị trí kiểm tra 5S — mỗi vị trí có bộ tiêu chí (bảng kiểm) riêng"
        actions={
          <button
            className={btnPrimary}
            onClick={() => {
              setFormError(null)
              setForm({ ten_vitri: '', thu_tu: (vitriTypes.at(-1)?.thu_tu ?? 0) + 1 })
            }}
          >
            <Plus size={15} /> Thêm vị trí đánh giá
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}

      {loading ? (
        <LoadingRow text="Đang tải danh sách vị trí..." />
      ) : vitriTypes.length === 0 ? (
        <EmptyState icon={<MapPin size={28} />} message="Chưa có vị trí đánh giá nào." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
                <th className="w-16 px-4 py-3 font-medium">Thứ tự</th>
                <th className="px-4 py-3 font-medium">Tên vị trí đánh giá</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vitriTypes.map((vt) => (
                <tr key={vt.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-gray-400">{vt.thu_tu}</td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{vt.ten_vitri}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                        title="Sửa"
                        onClick={() => {
                          setFormError(null)
                          setForm({ id: vt.id, ten_vitri: vt.ten_vitri, thu_tu: vt.thu_tu })
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                        title="Xoá"
                        onClick={() => setDeleting(vt)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        💡 Vị trí mới thêm sẽ chưa có tiêu chí — cần bổ sung tiêu chí trong dữ liệu bảng kiểm trước khi dùng để đánh giá.
      </p>

      <Modal
        open={!!form}
        title={form?.id ? 'Sửa vị trí đánh giá' : 'Thêm vị trí đánh giá'}
        onClose={() => setForm(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setForm(null)}>Huỷ</button>
            <button className={btnPrimary} disabled={saving} onClick={handleSubmit}>
              <Check size={14} /> {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        {form && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {formError && (
              <div className="sm:col-span-3">
                <ErrorBanner message={formError} />
              </div>
            )}
            <Field label="Tên vị trí *" className="sm:col-span-2">
              <input
                className={inputCls}
                value={form.ten_vitri}
                onChange={(e) => setForm({ ...form, ten_vitri: e.target.value })}
                placeholder="VD: 21. Kho hồ sơ"
              />
            </Field>
            <Field label="Thứ tự">
              <input
                type="number"
                className={inputCls}
                value={form.thu_tu}
                onChange={(e) => setForm({ ...form, thu_tu: Number(e.target.value) })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        title="Xoá vị trí đánh giá"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setDeleting(null)}>Huỷ</button>
            <button className={btnDanger} disabled={deleteBusy} onClick={handleDelete}>
              <Trash2 size={14} /> {deleteBusy ? 'Đang xoá...' : 'Xoá vị trí'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn chắc chắn muốn xoá vị trí <b>{deleting?.ten_vitri}</b>? Các cấu hình khoa
          và bảng kiểm gắn với vị trí này sẽ không dùng được nữa.
        </p>
      </Modal>
    </div>
  )
}
