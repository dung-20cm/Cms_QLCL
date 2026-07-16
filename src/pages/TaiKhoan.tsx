import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
  KeyRound,
} from "lucide-react";
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
} from "../components/ui/PageShell";
import SearchableSelect from "../components/ui/SearchableSelect";
import Pagination, { usePagination } from "../components/ui/Pagination";
import {
  fetchUserListFull,
  fetchRoleList,
  createUpdateUser,
  deleteUser,
} from "../features/qlcl/api";
import type { Role, UserFull } from "../features/qlcl/types";
import { useAppSelector } from "../app/hooks";
import { PERMISSION } from "../features/auth/permissions";
import { useHasPermission } from "../features/auth/usePermission";

// Role mà Trưởng khoa KHÔNG được phép gán (khớp assertRoleAllowedForScopedManager ở backend)
const ROLE_SLUGS_ONLY_ADMIN_CAN_ASSIGN = ["admin", "phong-qlcl"];

const roleBadge: Record<string, string> = {
  admin:
    "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20",
  "phong-qlcl":
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
  "truong-khoa":
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  "nhan-vien":
    "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20",
};

interface FormState {
  id?: number;
  username: string;
  password: string;
  email: string;
  mobile: string;
  khoa_id: number | "";
  role_id: number | "";
  status: number;
}

const emptyForm: FormState = {
  username: "",
  password: "",
  email: "",
  mobile: "",
  khoa_id: "",
  role_id: "",
  status: 1,
};

// Bỏ dấu tiếng Việt (kể cả đ/Đ không tự tách dấu qua NFD)
function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Gợi ý tên đăng nhập từ họ tên: tên chính (từ cuối) + ký tự đầu các từ trước đó
// VD: "Phan Thu Phương" -> "phuongpt" ; "Lương Thị Mai Anh" -> "anhltm"
function suggestUsername(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const ten = removeVietnameseTones(words[words.length - 1]).toLowerCase();
  const initials = words
    .slice(0, -1)
    .map((w) => removeVietnameseTones(w).toLowerCase().charAt(0))
    .join("");
  return `${ten}${initials}`.replace(/[^a-z0-9]/g, "");
}

type FormErrors = Partial<
  Record<"email" | "username" | "password" | "khoa_id" | "role_id", string>
>;

// Validate các trường bắt buộc — không cho để trống
function validateForm(f: FormState): FormErrors {
  const errs: FormErrors = {};
  if (!f.email.trim()) errs.email = "Vui lòng nhập họ và tên";
  if (!f.username.trim()) errs.username = "Vui lòng nhập tên đăng nhập";
  if (!f.id && !f.password.trim())
    errs.password = "Vui lòng nhập mật khẩu cho tài khoản mới";
  if (f.khoa_id === "") errs.khoa_id = "Vui lòng chọn khoa/phòng";
  if (f.role_id === "") errs.role_id = "Vui lòng chọn quyền (role)";
  return errs;
}

export default function TaiKhoan() {
  const { khoaList } = useCatalog();
  const currentUser = useAppSelector((s) => s.auth.user);
  // Trang này chỉ Admin (TAO_TAI_KHOAN) và Trưởng khoa (TAO_TAI_KHOAN_NHAN_VIEN) truy cập được
  // (xem PERM_QUAN_LY_TAI_KHOAN trong App.tsx) — không có TAO_TAI_KHOAN nghĩa là Trưởng khoa,
  // chỉ được CRUD tài khoản trong khoa/phòng của chính mình.
  const isScopedManager = !useHasPermission(PERMISSION.TAO_TAI_KHOAN);

  const [rows, setRows] = useState<UserFull[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filter
  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState("");

  // modal form
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  // true khi người dùng đã tự sửa tên đăng nhập → ngừng tự gợi ý theo họ tên
  const [usernameTouched, setUsernameTouched] = useState(false);

  // delete confirm
  const [deleting, setDeleting] = useState<UserFull | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetchUserListFull({ page: 1, limit: 500 }),
      fetchRoleList().catch(() => ({ rows: [] as Role[], total: 0 })),
    ])
      .then(([u, r]) => {
        setRows(u.rows);
        setRoles(r.rows);
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách tài khoản",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((u) => {
        if (
          fName &&
          !`${u.username} ${u.email || ""}`
            .toLowerCase()
            .includes(fName.toLowerCase())
        )
          return false;
        if (fRole && u.user_role?.role?.slug !== fRole) return false;
        return true;
      }),
    [rows, fName, fRole],
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedRows,
    pageSize,
    totalItems,
  } = usePagination(filtered, { resetKey: `${fName}|${fRole}` });

  // Trưởng khoa không được gán role admin/phong-qlcl (khớp guard ở backend)
  const assignableRoles = useMemo(
    () =>
      isScopedManager
        ? roles.filter((r) => !ROLE_SLUGS_ONLY_ADMIN_CAN_ASSIGN.includes(r.slug))
        : roles,
    [roles, isScopedManager],
  );

  const kpi = useMemo(() => {
    const byRole = new Map<string, number>();
    for (const u of rows) {
      const slug = u.user_role?.role?.slug || "chua-gan";
      byRole.set(slug, (byRole.get(slug) || 0) + 1);
    }
    return {
      total: rows.length,
      active: rows.filter((u) => u.status === 1).length,
      admin: byRole.get("admin") || 0,
      chuaGan: byRole.get("chua-gan") || 0,
    };
  }, [rows]);

  function openCreate() {
    setFormError(null);
    setFieldErrors({});
    setUsernameTouched(false);
    setForm({
      ...emptyForm,
      // Trưởng khoa chỉ tạo được tài khoản trong khoa/phòng của chính mình
      khoa_id: isScopedManager ? (currentUser?.khoa_id ?? "") : "",
    });
  }

  function openEdit(u: UserFull) {
    setFormError(null);
    setFieldErrors({});
    setUsernameTouched(true); // tài khoản đã có sẵn tên đăng nhập, không tự gợi ý lại
    setForm({
      id: u.id,
      username: u.username,
      password: "",
      email: u.email || "",
      mobile: u.mobile || "",
      khoa_id: u.khoa_id ?? "",
      role_id: u.user_role?.role_id ?? "",
      status: u.status,
    });
  }

  async function handleSubmit() {
    if (!form) return;
    const errs = validateForm(form);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError("Vui lòng điền đầy đủ các trường bắt buộc (*)");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await createUpdateUser({
        id: form.id,
        username: form.username.trim(),
        // chỉ gửi password khi có nhập (sửa mà bỏ trống = giữ mật khẩu cũ)
        ...(form.password ? { password: form.password } : {}),
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        khoa_id: form.khoa_id === "" ? null : Number(form.khoa_id),
        role_id: Number(form.role_id),
        status: form.status,
      });
      setForm(null);
      load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Lưu thất bại, vui lòng thử lại!",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteUser(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá thất bại!");
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
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
        <KpiCard
          label="Chưa gán quyền"
          value={kpi.chuaGan}
          accent={kpi.chuaGan ? "yellow" : "navy"}
        />
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Tìm kiếm" className="min-w-52 flex-1">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className={`${inputCls} w-full pl-9`}
              placeholder="Tên đăng nhập hoặc họ tên..."
              value={fName}
              onChange={(e) => setFName(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Quyền">
          <select
            className={inputCls}
            value={fRole}
            onChange={(e) => setFRole(e.target.value)}
          >
            <option value="">— Tất cả —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          className={btnSecondary}
          onClick={() => {
            setFName("");
            setFRole("");
          }}
        >
          <RotateCcw size={15} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">
          {filtered.length} tài khoản
        </span>
      </div>

      {/* Bảng user */}
      {loading ? (
        <LoadingRow text="Đang tải danh sách tài khoản..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          message="Không có tài khoản nào khớp bộ lọc."
        />
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
                {pagedRows.map((u, i) => {
                  const role = u.user_role?.role;
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700 dark:text-gray-200">
                          {u.username}
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] font-normal text-brand-500">
                              (bạn)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {u.email || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {u.khoa?.ten_khoa || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {role ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleBadge[role.slug] || roleBadge["nhan-vien"]}`}
                          >
                            {role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">
                            Chưa gán quyền
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            u.status === 1
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${u.status === 1 ? "bg-emerald-500" : "bg-gray-300"}`}
                          />
                          {u.status === 1 ? "Hoạt động" : "Đã khoá"}
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
                            title={
                              isSelf
                                ? "Không thể tự xoá tài khoản đang đăng nhập"
                                : "Xoá tài khoản"
                            }
                            disabled={isSelf}
                            onClick={() => setDeleting(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
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

      {/* ── Modal tạo / sửa ── */}
      <Modal
        open={!!form}
        title={
          form?.id ? `Sửa tài khoản — ${form.username}` : "Tạo tài khoản mới"
        }
        onClose={() => setForm(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setForm(null)}>
              Huỷ
            </button>
            <button
              className={btnPrimary}
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving
                ? "Đang lưu..."
                : form?.id
                  ? "Lưu thay đổi"
                  : "Tạo tài khoản"}
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
            <Field label="Họ và tên *">
              <input
                className={`${inputCls} ${fieldErrors.email ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={form.email}
                onChange={(e) => {
                  const hoTen = e.target.value;
                  setForm((f) => {
                    if (!f) return f;
                    const next = { ...f, email: hoTen };
                    if (!f.id && !usernameTouched)
                      next.username = suggestUsername(hoTen);
                    return next;
                  });
                  setFieldErrors((fe) => ({ ...fe, email: undefined }));
                }}
                placeholder="VD: Nguyễn Văn Anh"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-red-500">
                  {fieldErrors.email}
                </p>
              )}
            </Field>
            <Field label="Số điện thoại">
              <input
                className={inputCls}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="09xx..."
              />
            </Field>
            <Field label="Tên đăng nhập *">
              <input
                className={`${inputCls} ${fieldErrors.username ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={form.username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setForm({ ...form, username: e.target.value });
                  setFieldErrors((fe) => ({ ...fe, username: undefined }));
                }}
                placeholder="VD: anhnv"
              />
              {fieldErrors.username && (
                <p className="mt-1 text-[11px] text-red-500">
                  {fieldErrors.username}
                </p>
              )}
            </Field>
            <Field label={form.id ? "Mật khẩu *" : "Mật khẩu *"}>
              <div className="relative">
                <KeyRound
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  className={`${inputCls} w-full pl-9 ${fieldErrors.password ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    setFieldErrors((fe) => ({ ...fe, password: undefined }));
                  }}
                  placeholder={form.id ? "••••••" : "Tối thiểu 6 ký tự"}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-red-500">
                  {fieldErrors.password}
                </p>
              )}
            </Field>

            <Field label="Khoa / Phòng *">
              <SearchableSelect
                value={form.khoa_id}
                onChange={(v) => {
                  setForm({ ...form, khoa_id: v });
                  setFieldErrors((fe) => ({ ...fe, khoa_id: undefined }));
                }}
                options={khoaList.map((k) => ({
                  value: k.id,
                  label: k.ten_khoa,
                }))}
                placeholder="— Chọn khoa/phòng —"
                disabled={isScopedManager}
                className={
                  fieldErrors.khoa_id
                    ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                    : ""
                }
              />
              {isScopedManager ? (
                <p className="mt-1 text-[11px] text-gray-400">
                  Trưởng khoa chỉ quản lý được tài khoản trong khoa/phòng của mình.
                </p>
              ) : (
                fieldErrors.khoa_id && (
                  <p className="mt-1 text-[11px] text-red-500">
                    {fieldErrors.khoa_id}
                  </p>
                )
              )}
            </Field>
            <Field label="Quyền (role) *">
              <select
                className={`${inputCls} ${fieldErrors.role_id ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
                value={form.role_id}
                onChange={(e) => {
                  setForm({
                    ...form,
                    role_id: e.target.value ? Number(e.target.value) : "",
                  });
                  setFieldErrors((fe) => ({ ...fe, role_id: undefined }));
                }}
              >
                <option value="">— Chọn quyền —</option>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {fieldErrors.role_id && (
                <p className="mt-1 text-[11px] text-red-500">
                  {fieldErrors.role_id}
                </p>
              )}
            </Field>
            <Field label="Trạng thái" className="sm:col-span-2">
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: Number(e.target.value) })
                }
              >
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
            <button className={btnSecondary} onClick={() => setDeleting(null)}>
              Huỷ
            </button>
            <button
              className={btnDanger}
              disabled={deleteBusy}
              onClick={handleDelete}
            >
              <Trash2 size={14} />{" "}
              {deleteBusy ? "Đang xoá..." : "Xoá tài khoản"}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn chắc chắn muốn xoá tài khoản <b>{deleting?.username}</b>
          {deleting?.khoa?.ten_khoa ? ` (${deleting.khoa.ten_khoa})` : ""}? Tài
          khoản sẽ không thể đăng nhập sau khi xoá.
        </p>
      </Modal>
    </div>
  );
}
