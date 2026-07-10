import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListChecks, Plus, Pencil, Trash2, Check, AlertTriangle } from 'lucide-react'
import {
  PageHeader,
  Field,
  inputCls,
  btnPrimary,
  btnSecondary,
  btnDanger,
  LoadingRow,
  ErrorBanner,
  Modal,
  useCatalog,
} from '../../components/ui/PageShell'
import { fetchChecklistItems, createUpdateChecklistItem, deleteChecklistItem } from '../../features/qlcl/api'
import type { ChecklistItem } from '../../features/qlcl/types'

// 5 nhom S co dinh - dong bo mau voi Bang kiem / du lieu seed (checklistItem.data.json)
const S_GROUPS = [
  { id: 'S1', name: 'Sang loc', color: '#D85A30', lt: '#FAECE7' },
  { id: 'S2', name: 'Sap xep', color: '#BA7517', lt: '#FAEEDA' },
  { id: 'S3', name: 'Sach se', color: '#1D9E75', lt: '#E1F5EE' },
  { id: 'S4', name: 'San soc', color: '#185FA5', lt: '#E6F1FB' },
  { id: 'S5', name: 'San sang', color: '#534AB7', lt: '#EEEDFE' },
] as const

type SGroupMeta = (typeof S_GROUPS)[number]

// Mot "tieu chi chung" = gop cac ban ghi checklist_item co cung noi dung (s_id/sub/tc)
// va co mat o DU tat ca vi tri danh gia hien co -- vi DB van luu theo tung vi tri
// (vitri_type_id bat buoc), nhung UI quan ly nhu 1 tieu chi dung chung moi vi tri.
interface GlobalCriterion {
  key: string
  s_id: string
  sub: string
  tc: string
  thu_tu: number
  ids: number[] // id cua tung dong (1 dong / vi tri) ung voi tieu chi chung nay
}

interface FormState {
  key?: string
  ids?: number[]
  s_id: string
  s_name: string
  s_color: string
  s_lt: string
  sub: string
  tc: string
  thu_tu: number
}

// Muc 4: CRUD tieu chi bang kiem (checklist_item) -- dung chung cho MOI vi tri danh gia.
// Giao dien mo phong Bang kiem: 5 khung S1-S5, moi khung co nut them moi + icon sua/xoa tung tieu chi.
// Them/sua/xoa 1 tieu chi o day se ap dung dong thoi cho tat ca vi tri danh gia hien co.
export default function CauHinhTieuChi() {
  const { vitriTypes, status: catalogStatus } = useCatalog()

  // Tieu chi hien thi lay tu 1 "vi tri tham chieu" (vi tri dau tien) -- dam bao
  // luon co du lieu de hien thi (khong phu thuoc viec cac vi tri khac co du 21
  // tieu chi giong het hay khong). allItems (toan bo, moi vi tri) chi dung de
  // xac dinh tieu chi nao da "phu du" moi vi tri, phuc vu sua/xoa dong loat.
  const refVitriId = vitriTypes[0]?.id

  const [refItems, setRefItems] = useState<ChecklistItem[]>([])
  const [allItems, setAllItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<GlobalCriterion | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!refVitriId) {
      setRefItems([])
      setAllItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    Promise.all([fetchChecklistItems(refVitriId), fetchChecklistItems()])
      .then(([refRes, allRes]) => {
        setRefItems(refRes.rows)
        setAllItems(allRes.rows)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Khong tai duoc danh sach tieu chi'))
      .finally(() => setLoading(false))
  }, [refVitriId])

  useEffect(load, [load])

  const globalCriteria = useMemo<GlobalCriterion[]>(() => {
    const allVitriIds = vitriTypes.map((v) => v.id)
    // key -> danh sach id + tap vitri_type_id co tieu chi cung noi dung (tren toan bo du lieu)
    const groupMap = new Map<string, { ids: number[]; vitriIds: Set<number> }>()
    for (const it of allItems) {
      const key = `${it.s_id}||${it.sub || ''}||${it.tc}`
      let g = groupMap.get(key)
      if (!g) {
        g = { ids: [], vitriIds: new Set() }
        groupMap.set(key, g)
      }
      g.ids.push(it.id)
      g.vitriIds.add(it.vitri_type_id)
    }
    return refItems.map((it) => {
      const key = `${it.s_id}||${it.sub || ''}||${it.tc}`
      const g = groupMap.get(key)
      // Chi coi la "dung chung moi vi tri" (cascade sua/xoa ca nhom) neu tieu chi
      // nay da co mat o DU tat ca vi tri hien co; neu khong (du lieu cu rieng
      // tung vi tri) thi sua/xoa chi anh huong dung dong cua vi tri tham chieu.
      const coversAll = g && allVitriIds.length > 0 && allVitriIds.every((id) => g.vitriIds.has(id))
      return {
        key,
        s_id: it.s_id,
        sub: it.sub || '',
        tc: it.tc,
        thu_tu: it.thu_tu,
        ids: coversAll ? g!.ids : [it.id],
      }
    })
  }, [refItems, allItems, vitriTypes])

  const groups = useMemo(
    () =>
      S_GROUPS.map((g) => ({
        ...g,
        items: globalCriteria.filter((c) => c.s_id === g.id).sort((a, b) => a.thu_tu - b.thu_tu),
      })),
    [globalCriteria],
  )

  function openAdd(g: SGroupMeta) {
    if (vitriTypes.length === 0) return
    setFormError(null)
    const maxThuTu = Math.max(0, ...globalCriteria.filter((c) => c.s_id === g.id).map((c) => c.thu_tu || 0))
    setForm({ s_id: g.id, s_name: g.name, s_color: g.color, s_lt: g.lt, sub: '', tc: '', thu_tu: maxThuTu + 1 })
  }

  function openEdit(c: GlobalCriterion) {
    const meta = S_GROUPS.find((g) => g.id === c.s_id)!
    setFormError(null)
    setForm({
      key: c.key,
      ids: c.ids,
      s_id: meta.id,
      s_name: meta.name,
      s_color: meta.color,
      s_lt: meta.lt,
      sub: c.sub,
      tc: c.tc,
      thu_tu: c.thu_tu,
    })
  }

  async function handleSubmit() {
    if (!form) return
    if (!form.tc.trim()) return setFormError('Vui long nhap noi dung tieu chi!')
    if (vitriTypes.length === 0) return setFormError('Chua co vi tri danh gia nao trong he thong!')
    setSaving(true)
    setFormError(null)
    try {
      if (form.ids && form.ids.length > 0) {
        // Sua: cap nhat dong thoi tat ca cac dong (moi vi tri 1 dong) cua tieu chi nay
        await Promise.all(
          form.ids.map((id) =>
            createUpdateChecklistItem({
              id,
              sub: form.sub.trim() || null,
              tc: form.tc.trim(),
              thu_tu: form.thu_tu,
            }),
          ),
        )
      } else {
        // Them moi: tao 1 dong cho MOI vi tri danh gia hien co -- ap dung cho moi vi tri
        await Promise.all(
          vitriTypes.map((vt) =>
            createUpdateChecklistItem({
              vitri_type_id: vt.id,
              s_id: form.s_id,
              s_name: form.s_name,
              s_color: form.s_color,
              s_lt: form.s_lt,
              sub: form.sub.trim() || null,
              tc: form.tc.trim(),
              thu_tu: form.thu_tu,
            }),
          ),
        )
      }
      setForm(null)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Luu that bai!')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await Promise.all(deleting.ids.map((id) => deleteChecklistItem(id)))
      setDeleting(null)
      load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Xoa that bai!')
    } finally {
      setDeleteBusy(false)
    }
  }

  const isLoading = catalogStatus === 'loading' || catalogStatus === 'idle' || loading

  return (
    <div>
      <PageHeader
        icon={<ListChecks size={22} />}
        title="Cau hinh tieu chi bang kiem"
        subtitle={`Tieu chi 5S dung chung cho moi vi tri danh gia${vitriTypes.length > 0 ? ` (${vitriTypes.length} vi tri)` : ''} -- them/sua/xoa 1 tieu chi se ap dung cho tat ca vi tri`}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {vitriTypes.length === 0 && catalogStatus === 'succeeded' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          Chua co vi tri danh gia nao trong he thong. Vao <b>Cau hinh {'->'} Vi tri danh gia</b> de tao it nhat 1 vi
          tri truoc khi them tieu chi.
        </div>
      )}

      {isLoading ? (
        <LoadingRow text="Dang tai tieu chi..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ backgroundColor: g.lt }}>
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.id}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: g.color }}>{g.name}</span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {g.items.length} tieu chi
                  </span>
                </div>
                <button
                  className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-white/80 px-2.5 text-xs font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ color: g.color }}
                  disabled={vitriTypes.length === 0}
                  onClick={() => openAdd(g)}
                >
                  <Plus size={13} /> Them moi
                </button>
              </div>
              {g.items.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  Chua co tieu chi nao trong nhom {g.name}.
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {g.items.map((c) => (
                    <li key={c.key} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        {c.sub && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: g.color }}>
                            {c.sub}
                          </p>
                        )}
                        <p className="mt-0.5 text-sm leading-snug text-gray-700 dark:text-gray-300">{c.tc}</p>
                      </div>
                      <div className="flex shrink-0 gap-1.5 pt-0.5">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                          title="Sua"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                          title="Xoa"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleting(c)
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Xoa tieu chi la xoa mem (an khoi bang kiem o moi vi tri) -- du lieu cac luot danh gia cu da dung tieu chi
        nay van duoc giu nguyen de tra cuu bao cao.
      </p>

      {/* Modal them / sua tieu chi */}
      <Modal
        open={!!form}
        title={form?.ids ? `Sua tieu chi -- ${form.s_id}` : `Them tieu chi moi -- ${form?.s_id ?? ''}`}
        onClose={() => setForm(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setForm(null)}>Huy</button>
            <button className={btnPrimary} disabled={saving} onClick={handleSubmit}>
              <Check size={14} /> {saving ? 'Dang luu...' : 'Luu'}
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
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium sm:col-span-3"
              style={{ backgroundColor: form.s_lt, color: form.s_color }}
            >
              Nhom {form.s_id} -- {form.s_name} - Ap dung cho tat ca {vitriTypes.length} vi tri danh gia
            </div>
            <Field label="Ma tieu chi con (VD: AT1, 3 Khong (1)...)" className="sm:col-span-2">
              <input
                className={inputCls}
                value={form.sub}
                onChange={(e) => setForm({ ...form, sub: e.target.value })}
                placeholder="Khong bat buoc"
              />
            </Field>
            <Field label="Thu tu">
              <input
                type="number"
                className={inputCls}
                value={form.thu_tu}
                onChange={(e) => setForm({ ...form, thu_tu: Number(e.target.value) })}
              />
            </Field>
            <Field label="Noi dung tieu chi *" className="sm:col-span-3">
              <textarea
                className={`${inputCls} h-24 resize-none py-2`}
                value={form.tc}
                onChange={(e) => setForm({ ...form, tc: e.target.value })}
                placeholder="VD: Khong co do dung ca nhan cua nguoi benh/nguoi nha de lon xon ngoai khu vuc quy dinh"
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Modal canh bao xoa -- nhan manh anh huong toi bao cao truoc khi xoa that */}
      <Modal
        open={!!deleting}
        title="Xoa tieu chi -- can xac nhan"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setDeleting(null)}>Huy</button>
            <button className={btnDanger} disabled={deleteBusy} onClick={handleDelete}>
              <Trash2 size={14} /> {deleteBusy ? 'Dang xoa...' : 'Toi chac chan, xoa tieu chi'}
            </button>
          </>
        }
      >
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Xoa tieu chi {deleting?.sub && <b>{deleting.sub} -- </b>}
            <b>"{deleting?.tc}"</b> se <b>anh huong den bao cao, bang tong hop va bieu do xu huong</b> o{' '}
            <b>tat ca {deleting?.ids.length ?? 0} vi tri danh gia</b> dang dung tieu chi nay (diem % nhom{' '}
            {deleting?.s_id} cua cac luot danh gia lien quan co the thay doi cach hien thi). Ban co chac chan muon
            xoa?
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
