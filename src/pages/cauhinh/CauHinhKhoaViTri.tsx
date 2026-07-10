import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Plus, X, Save, CheckSquare, Square } from 'lucide-react'
import {
  PageHeader,
  Field,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  useCatalog,
} from '../../components/ui/PageShell'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { fetchVitriChiTietList, createUpdateVitriChiTiet, deleteVitriChiTiet } from '../../features/qlcl/api'
import type { VitriChiTiet } from '../../features/qlcl/types'

// Bỏ tiền tố "1. ", "12. " trong tên vị trí khi dùng làm mã mặc định
const stripPrefix = (s: string) => s.replace(/^\d+\.\s*/, '')

// Draft cấu hình local: vitri_type_id -> danh sách mã vị trí chi tiết
type Draft = Record<number, string[]>

function draftFromRows(rows: VitriChiTiet[]): Draft {
  const d: Draft = {}
  for (const r of rows) {
    ;(d[r.vitri_type_id] ||= []).push(r.ma_vitri)
  }
  return d
}

function sameDraft(a: Draft, b: Draft): boolean {
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  for (const k of ka) {
    const la = [...(a[Number(k)] || [])].sort()
    const lb = [...(b[Number(k)] || [])].sort()
    if (la.length !== lb.length || la.some((v, i) => v !== lb[i])) return false
  }
  return true
}

// Mục 1: Cấu hình khoa nào cần kiểm tra vị trí nào (tick local → Lưu tổng 1 lần)
export default function CauHinhKhoaViTri() {
  const { khoaList, vitriTypes } = useCatalog()

  const [error, setError] = useState<string | null>(null)
  const [khoaId, setKhoaId] = useState<number | ''>('')
  const [serverRows, setServerRows] = useState<VitriChiTiet[]>([])
  const [draft, setDraft] = useState<Draft>({})
  const [ctLoading, setCtLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [addingMa, setAddingMa] = useState<Record<number, string>>({})

  const loadCt = useCallback(() => {
    if (khoaId === '') {
      setServerRows([])
      setDraft({})
      return
    }
    setCtLoading(true)
    fetchVitriChiTietList({ khoa_id: Number(khoaId) })
      .then((res) => {
        setServerRows(res.rows)
        setDraft(draftFromRows(res.rows))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được cấu hình khoa'))
      .finally(() => setCtLoading(false))
  }, [khoaId])

  useEffect(loadCt, [loadCt])
  useEffect(() => setSavedMsg(null), [khoaId])

  const serverDraft = useMemo(() => draftFromRows(serverRows), [serverRows])
  const dirty = useMemo(() => !sameDraft(draft, serverDraft), [draft, serverDraft])
  const allTicked = vitriTypes.length > 0 && vitriTypes.every((vt) => draft[vt.id]?.length)
  const canEdit = khoaId !== '' && !ctLoading

  function toggleType(vtId: number, tenVitri: string) {
    if (!canEdit) return
    setSavedMsg(null)
    setDraft((p) => {
      const next = { ...p }
      if (next[vtId]?.length) delete next[vtId]
      else next[vtId] = [stripPrefix(tenVitri)]
      return next
    })
  }

  function toggleAll() {
    if (!canEdit) return
    setSavedMsg(null)
    if (allTicked) {
      setDraft({})
    } else {
      const next: Draft = {}
      for (const vt of vitriTypes) {
        next[vt.id] = draft[vt.id]?.length ? draft[vt.id] : [stripPrefix(vt.ten_vitri)]
      }
      setDraft(next)
    }
  }

  function addMa(vtId: number) {
    const ma = (addingMa[vtId] || '').trim()
    if (!ma) return
    setSavedMsg(null)
    setDraft((p) => {
      const list = p[vtId] || []
      if (list.includes(ma)) return p
      return { ...p, [vtId]: [...list, ma] }
    })
    setAddingMa((p) => ({ ...p, [vtId]: '' }))
  }

  function removeMa(vtId: number, ma: string) {
    setSavedMsg(null)
    setDraft((p) => {
      const list = (p[vtId] || []).filter((m) => m !== ma)
      const next = { ...p }
      if (list.length === 0) delete next[vtId]
      else next[vtId] = list
      return next
    })
  }

  // Lưu tổng: so sánh draft với server → tạo mới phần thêm, xoá phần gỡ
  async function handleSaveConfig() {
    if (khoaId === '' || !dirty) return
    setSaving(true)
    setError(null)
    try {
      const wanted = new Set<string>()
      for (const [typeId, list] of Object.entries(draft)) {
        for (const ma of list) wanted.add(`${typeId}|${ma}`)
      }
      const existing = new Map<string, VitriChiTiet>()
      for (const r of serverRows) existing.set(`${r.vitri_type_id}|${r.ma_vitri}`, r)

      let created = 0
      let removed = 0
      for (const key of wanted) {
        if (!existing.has(key)) {
          const typeId = key.slice(0, key.indexOf('|'))
          const ma = key.slice(key.indexOf('|') + 1)
          await createUpdateVitriChiTiet({ khoa_id: Number(khoaId), vitri_type_id: Number(typeId), ma_vitri: ma })
          created++
        }
      }
      for (const [key, row] of existing) {
        if (!wanted.has(key)) {
          await deleteVitriChiTiet(row.id)
          removed++
        }
      }
      setSavedMsg(`✓ Đã lưu cấu hình (${created} thêm, ${removed} gỡ)`)
      loadCt()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu cấu hình thất bại!')
    } finally {
      setSaving(false)
    }
  }

  const selectedKhoa = khoaList.find((k) => k.id === khoaId)

  return (
    <div>
      <PageHeader
        icon={<Building2 size={22} />}
        title="Cấu hình khoa – vị trí đánh giá"
        subtitle="Chọn khoa → tick các vị trí khoa đó cần kiểm tra 5S → Lưu cấu hình"
        actions={
          <>
            {savedMsg && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{savedMsg}</span>}
            {dirty && <span className="text-xs text-amber-500">● Chưa lưu</span>}
            <button className={btnSecondary} disabled={!canEdit} onClick={toggleAll}>
              {allTicked ? <Square size={15} /> : <CheckSquare size={15} />}
              {allTicked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            <button className={btnPrimary} disabled={!canEdit || !dirty || saving} onClick={handleSaveConfig}>
              <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </>
        }
      />

      {error && <ErrorBanner message={error} onRetry={() => setError(null)} />}

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Chọn Khoa / Phòng / Trung tâm cần cấu hình" className="max-w-md">
          <SearchableSelect
            value={khoaId}
            onChange={setKhoaId}
            options={khoaList.map((k) => ({ value: k.id, label: k.ten_khoa }))}
            placeholder="— Chọn khoa —"
          />
        </Field>
        <p className="mt-3 text-xs text-gray-400">
          {selectedKhoa ? (
            <>
              Tick vị trí mà <b className="text-gray-600 dark:text-gray-300">{selectedKhoa.ten_khoa}</b> cần kiểm tra,
              thêm mã chi tiết nếu cần (VD: E101, Xe tiêm 2...), rồi bấm <b>Lưu cấu hình</b>.
              Bảng kiểm / Lịch đánh giá sẽ chỉ hiện các vị trí được cấu hình ở đây.
            </>
          ) : (
            'Chưa chọn khoa — danh sách dưới chỉ để xem. Chọn một khoa để bắt đầu tick cấu hình.'
          )}
        </p>
      </div>

      {ctLoading ? (
        <LoadingRow text="Đang tải cấu hình..." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vitriTypes.map((vt) => {
            const list = draft[vt.id] || []
            const checked = list.length > 0
            return (
              <div
                key={vt.id}
                className={`rounded-2xl border p-4 transition ${
                  checked
                    ? 'border-brand-200 bg-brand-25 dark:border-brand-500/30 dark:bg-brand-500/5'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                } ${!canEdit ? 'opacity-70' : ''}`}
              >
                <label className={`flex items-center justify-between gap-2 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <span className={`text-sm font-medium ${checked ? 'text-brand-700 dark:text-brand-400' : 'text-gray-600 dark:text-gray-300'}`}>
                    {vt.ten_vitri}
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
                    checked={checked}
                    disabled={!canEdit}
                    onChange={() => toggleType(vt.id, vt.ten_vitri)}
                  />
                </label>

                {checked && (
                  <div className="mt-3 border-t border-brand-100 pt-3 dark:border-brand-500/20">
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((ma) => (
                        <span
                          key={ma}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                        >
                          {ma}
                          <button
                            className="text-gray-300 transition hover:text-red-500"
                            title="Xoá mã vị trí này"
                            onClick={() => removeMa(vt.id, ma)}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <input
                        className={`${inputCls} h-8 flex-1 text-xs`}
                        placeholder="Thêm mã: E101, Xe tiêm 2..."
                        value={addingMa[vt.id] || ''}
                        onChange={(e) => setAddingMa((p) => ({ ...p, [vt.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addMa(vt.id)}
                      />
                      <button
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-50"
                        disabled={!(addingMa[vt.id] || '').trim()}
                        onClick={() => addMa(vt.id)}
                        title="Thêm mã vị trí"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
