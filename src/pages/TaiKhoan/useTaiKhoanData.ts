// Toàn bộ state + dữ liệu tính toán của trang Quản lý tài khoản (danh sách,
// bộ lọc, phân trang, modal tạo/sửa + gợi ý tên đăng nhập, xoá...) -- tách
// khỏi index.tsx để component container chỉ còn lo render.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useCatalog } from "../../components/ui/PageShell";
import { usePagination } from "../../components/ui/Pagination";
import { PERMISSION } from "../../features/auth/permissions";
import { useHasPermission, useIsViewOnly } from "../../features/auth/usePermission";
import {
  createUpdateUser,
  deleteUser,
  fetchRoleList,
  fetchUserListFull,
} from "../../features/qlcl/api";
import { loadCatalog } from "../../features/qlcl/catalogSlice";
import type { Role, UserFull } from "../../features/qlcl/types";
import { useToast } from "../../features/ui/useToast";
import { emptyForm, ROLE_SLUGS_ONLY_ADMIN_CAN_ASSIGN } from "./constants";
import { validateForm } from "./helpers";
import type { FormErrors, FormState } from "./types";

export function useTaiKhoanData() {
  const { khoaList } = useCatalog();
  const currentUser = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  // Trang này giờ có 3 đối tượng truy cập (xem PERM_QUAN_LY_TAI_KHOAN trong
  // App.tsx): Admin (TAO_TAI_KHOAN, toàn quyền mọi khoa), Trưởng khoa
  // (TAO_TAI_KHOAN_NHAN_VIEN, chỉ CRUD trong khoa/phòng mình), và Lãnh đạo
  // (XEM_TOAN_QUYEN_BAO_CAO_LICH, chỉ xem mọi khoa — không CRUD).
  // LƯU Ý: Admin trong sơ đồ phân quyền giữ HỢP của mọi role (xem
  // seedRolePermission.js) nên Admin CŨNG giữ TAO_TAI_KHOAN_NHAN_VIEN --
  // không thể chỉ check "có quyền này" để suy ra Trưởng khoa, phải loại trừ
  // thêm trường hợp có luôn TAO_TAI_KHOAN (Admin) mới đúng là Trưởng khoa.
  // Gọi cả 2 hook KHÔNG ĐIỀU KIỆN (tránh vi phạm rules-of-hooks nếu viết
  // `A && !B` -- B sẽ bị bỏ qua khi A false) rồi mới suy ra isScopedManager.
  const hasTaoTaiKhoanNhanVien = useHasPermission(
    PERMISSION.TAO_TAI_KHOAN_NHAN_VIEN,
  );
  const hasTaoTaiKhoan = useHasPermission(PERMISSION.TAO_TAI_KHOAN);
  const isScopedManager = hasTaoTaiKhoanNhanVien && !hasTaoTaiKhoan;
  const isViewOnly = useIsViewOnly();
  const toast = useToast();

  const [rows, setRows] = useState<UserFull[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filter
  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState("");
  // Chỉ Admin (không scoped theo 1 khoa cố định) mới cần lọc theo khoa/phòng
  // -- Trưởng khoa vào trang này đã luôn chỉ thấy đúng khoa của mình rồi.
  const [fKhoa, setFKhoa] = useState<number | "">("");

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
        if (fKhoa !== "" && u.khoa_id !== fKhoa) return false;
        return true;
      }),
    [rows, fName, fRole, fKhoa],
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedRows,
    pageSize,
    totalItems,
  } = usePagination(filtered, { resetKey: `${fName}|${fRole}|${fKhoa}` });

  // Trưởng khoa không được gán role admin/phong-qlcl (khớp guard ở backend)
  const assignableRoles = useMemo(
    () =>
      isScopedManager
        ? roles.filter(
            (r) => !ROLE_SLUGS_ONLY_ADMIN_CAN_ASSIGN.includes(r.slug),
          )
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
      const wasEdit = !!form.id;
      setForm(null);
      load();
      // Danh mục dùng chung (catalog.users) không tự làm mới -- các trang khác
      // (Lịch đánh giá, Tiến độ KP, Bảng kiểm...) đang cache danh sách cán bộ
      // này, nếu không ép tải lại thì tài khoản vừa tạo/sửa sẽ không xuất hiện
      // ở các ô chọn người cho tới khi tải lại cả trang.
      dispatch(loadCatalog());
      toast.success(wasEdit ? "Đã lưu thay đổi tài khoản!" : "Đã tạo tài khoản mới!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại, vui lòng thử lại!";
      setFormError(msg);
      toast.error(msg);
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
      dispatch(loadCatalog());
      toast.success("Đã xoá tài khoản!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xoá thất bại!";
      setError(msg);
      setDeleting(null);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  return {
    khoaList,
    currentUser,
    isScopedManager,
    isViewOnly,
    rows,
    roles,
    loading,
    error,
    load,
    fName,
    setFName,
    fRole,
    setFRole,
    fKhoa,
    setFKhoa,
    filtered,
    page,
    setPage,
    totalPages,
    pagedRows,
    pageSize,
    totalItems,
    assignableRoles,
    kpi,
    form,
    setForm,
    formError,
    fieldErrors,
    setFieldErrors,
    saving,
    usernameTouched,
    setUsernameTouched,
    deleting,
    setDeleting,
    deleteBusy,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
  };
}

export type TaiKhoanData = ReturnType<typeof useTaiKhoanData>;
