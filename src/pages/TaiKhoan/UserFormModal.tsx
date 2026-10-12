import { KeyRound } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  Field,
  inputCls,
  Modal,
} from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { buildUsername } from "./helpers";
import type { TaiKhoanData } from "./useTaiKhoanData";

export default function UserFormModal({ t }: { t: TaiKhoanData }) {
  const {
    form,
    setForm,
    formError,
    fieldErrors,
    setFieldErrors,
    saving,
    handleSubmit,
    usernameTouched,
    setUsernameTouched,
    khoaList,
    isScopedManager,
    assignableRoles,
  } = t;

  return (
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
            {saving ? "Đang lưu..." : form?.id ? "Lưu thay đổi" : "Tạo tài khoản"}
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
                    next.username = buildUsername(hoTen, f.khoa_id, khoaList);
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
          {/* Tạo mới không nhập mật khẩu: mật khẩu mặc định = tên đăng nhập (xem
              handleSubmit). Đổi mật khẩu đã có luồng riêng (ChangePasswordModal). */}
          {!form.id && (
            <p className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 sm:col-span-2">
              <KeyRound size={14} className="mt-0.5 shrink-0" />
              <span>
                Mật khẩu mặc định của tài khoản mới <b>trùng với tên đăng nhập</b>.
                Hãy nhắc người dùng đổi mật khẩu sau lần đăng nhập đầu tiên.
              </span>
            </p>
          )}

          <Field label="Khoa / Phòng *">
            <SearchableSelect
              value={form.khoa_id}
              onChange={(v) => {
                setForm((f) => {
                  if (!f) return f;
                  const next = { ...f, khoa_id: v };
                  if (!f.id && !usernameTouched)
                    next.username = buildUsername(f.email, v, khoaList);
                  return next;
                });
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
                Trưởng khoa chỉ quản lý được tài khoản trong khoa/phòng của
                mình.
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
  );
}
