import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Plus, Pencil, Trash2, Search, RotateCcw, KeyRound } from 'lucide-react'
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
import {
  fetchUserListFull,
  fetchRoleList,
  createUpdateUser,
  deleteUser,
} from '../features/qlcl/api'
import type { Role, UserFull } from '../features/qlcl/types'
import { useAppSelector } from '../app/hooks'

const roleBadge: Record<string, string> = {
  'admin': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20',
  'phong-qlcl': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20',
  'truong-khoa': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  'nhan-vien': 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20',
}

interface FormState {
  id?: number
  username: string
  password: string
  email: string
  mobile: string
  khoa_id: number | ''
  role_id: number | ''
  status: number
}

const emptyForm: FormState = { username: '', password: '', email: '', mobile: '', khoa_id: '', role_id: '', status: 1 }

export default function TaiKhoan() {
  const { khoaList } = useCatalog()
  const currentUser = useAppSelector((s) => s.auth.user)

  const [rows, setRows] = useState<UserFull[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filter
  const [fName, setFName] = useState('')
  const [fRole, setFRole] = useState('')

  // modal form
  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // delete confirm
  const [deleting, setDeleting] = useState<UserFull | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchUserListFull({ page: 1, limit: 500 }),
      fetchRoleList().catch(() => ({ rows: [] as Role[], total: 0 })),
    ])
      .then(([u, r]) => {
        setRows(u.rows)
        setRoles(r.rows)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được danh sách tài khoản'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const filtered = useMemo(
    () =>
      rows.filter((u) => {
        if (fName && !`${u.username} ${u.email || ''}`.toLowerCase().includes(fName.toLowerCase())) return false
        if (fRole && u.user_role?.role?.slug !== fRole) return false
        return true
      }),
    [rows, fName, fRole],
  )

  const kpi = useMemo(() => {
    const byRole = new Map<string, number>()
    for (const u of rows) {
      const slug = u.user_role?.role?.slug || 'chua-gan'
      byRole.set(slug, (byRole.get(slug) || 0) + 1)
    }
    return {
      total: rows.length,
      active: rows.filter((u) => u.status === 1).length,
      admin: byRole.get('admin') || 0,
      chuaGan: byRole.get('chua-gan') || 0,
    }
  }, [rows])

  function openCreate() {
    setFormError(null)
    setForm({ ...emptyForm })
  }

  function openEdit(u: UserFull) {
    setFormError(null)
    setForm({
      id: u.id,
      username: u.username,
      password: '',
      email: u.email || '',
      mobile: u.mobile || '',
      khoa_id: u.khoa_id ?? '',
      role_id: u.user_role?.role_id ?? '',
      status: u.status,
    })
  }

  async function handleSubmit() {
    if (!form) return
    if (!form.username.trim()) return setFormError('Vui lòng nhập tên đăng nhập!')
    if (!form.id && !form.password) return setFormError('Vui lòng nhập mật khẩu cho tài khoản mới!')
    if (form.role_id === '') return setFormError('Vui lòng chọn quyền (role) cho tài khoản!')

    setSaving(true)
    setFormError(null)
    try {
      await createUpdateUser({
        id: form.id,
        username: form.username.trim(),
        // chỉ gửi password khi có nhập (sửa mà bỏ trống = giữ mật khẩu cũ)
        ...(form.password ? { password: form.password } : {}),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        khoa_id: form.khoa_id === '' ? null : Number(form.khoa_id),
        role_id: Number(form.role_id),
        status: form.status,
      })
      setForm(null)
      load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lưu thất bại, vui lòng thử lại!')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteUser(deleting.id)
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
        icon={<Users size={22} />}
        title="Quản lý tài khoản"
        subtitle="Tạo tài khoản, phân quyền và quản lý người dùng hệ thống 5S (theo sơ đồ phân quyền)"
        actions={
          <button className={btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Tạo tài khoản
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Tổng tài khoản" value={kpi.total} accent="navy" />
        <KpiCard label="Đang hoạt động" value={kpi.active} accent="green" />
        <KpiCard label="Quản trị viên" value={kpi.admin} accent="blue" />
        <KpiCard label="Chưa gán quyền" value={kpi.chuaGan} accent={kpi.chuaGan ? 'yellow' : 'navy'} />
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Tìm kiếm" className="min-w-52 flex-1">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className={`${inputCls} w-full pl-9`}
              placeholder="Tên đăng nhập hoặc email..."
              value={fName}
              onChange={(e) => setFName(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Quyền">
          <select className={inputCls} value={fRole} onChange={(e) => setFRole(e.target.value)}>
            <option value="">— Tất cả —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </Field>
        <button className={btnSecondary} onClick={() => { setFName(''); setFRole('') }}>
          <RotateCcw size={15} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">{filtered.length} tài khoản</span>
      </div>

      {/* Bảng user */}
      {loading ? (
        <LoadingRow text="Đang tải danh sách tài khoản..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={28} />} message="Không có tài khoản nào khớp bộ lọc." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Tài khoản</th>
                  <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
                  <th className="px-4 py-3 font-medium">Quyền</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const role = u.user_role?.role
                  const isSelf = u.id === currentUser?.id
                  return (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700 dark:text-gray-200">
                          {u.username}
                          {isSelf && <span className="ml-1.5 text-[10px] font-normal text-brand-500">(bạn)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{u.email || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.khoa?.ten_khoa || '—'}</td>
                      <td className="px-4 py-3">
                        {role ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge[role.slug] || roleBadge['nhan-vien']}`}>
                            {role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">Chưa gán quyền</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            u.status === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.status === 1 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {u.status === 1 ? 'Hoạt động' : 'Đã khoá'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                            title="Sửa / phân quyền"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700"
                            title={isSelf ? 'Không thể tự xoá tài khoản đang đăng nhập' : 'Xoá tài khoản'}
                            disabled={isSelf}
                            onClick={() => setDeleting(u)}
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

      {/* ── Modal tạo / sửa ── */}
      <Modal
        open={!!form}
        title={form?.id ? `Sửa tài khoản — ${form.username}` : 'Tạo tài khoản mới'}
        onClose={() => setForm(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setForm(null)}>Huỷ</button>
            <button className={btnPrimary} disabled={saving} onClick={handleSubmit}>
              {saving ? 'Đang lưu...' : form?.id ? 'Lưu thay đổi' : 'Tạo tài khoản'}
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
            <Field label="Tên đăng nhập *">
              <input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="VD: nhanvien02" />
            </Field>
            <Field label={form.id ? 'Mật khẩu mới (bỏ trống = giữ nguyên)' : 'Mật khẩu *'}>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" autoComplete="new-password" className={`${inputCls} w-full pl-9`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.id ? '••••••' : 'Tối thiểu 6 ký tự'} />
              </div>
            </Field>
            <Field label="Email">
              <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ten@qlcl.vn" />
            </Field>
            <Field label="Số điện thoại">
              <input className={inputCls} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="09xx..." />
            </Field>
            <Field label="Khoa / Phòng">
              <select className={inputCls} value={form.khoa_id} onChange={(e) => setForm({ ...form, khoa_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">— Không thuộc khoa —</option>
                {khoaList.map((k) => (
                  <option key={k.id} value={k.id}>{k.ten_khoa}</option>
                ))}
              </select>
            </Field>
            <Field label="Quyền (role) *">
              <select className={inputCls} value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value ? Number(e.target.value) : '' })}>
                <option value="">— Chọn quyền —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
                <option value={1}>Hoạt động</option>
                <option value={0}>Khoá tài khoản</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {/* ── Confirm xoá ── */}
      <Modal
        open={!!deleting}
        title="Xoá tài khoản"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setDeleting(null)}>Huỷ</button>
            <button className={btnDanger} disabled={deleteBusy} onClick={handleDelete}>
              <Trash2 size={14} /> {deleteBusy ? 'Đang xoá...' : 'Xoá tài khoản'}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn chắc chắn muốn xoá tài khoản <b>{deleting?.username}</b>
          {deleting?.khoa?.ten_khoa ? ` (${deleting.khoa.ten_khoa})` : ''}?
          Tài khoản sẽ không thể đăng nhập sau khi xoá.
        </p>
      </Modal>
    </div>
  )
}
