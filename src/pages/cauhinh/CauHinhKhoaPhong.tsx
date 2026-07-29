import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Search,
} from "lucide-react";
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
} from "../../components/ui/PageShell";
import {
  fetchKhoaList,
  createUpdateKhoa,
  deleteKhoa,
} from "../../features/qlcl/api";
import type { Khoa } from "../../features/qlcl/types";
import { useAppDispatch } from "../../app/hooks";
import { loadCatalog } from "../../features/qlcl/catalogSlice";
import { useIsViewOnly } from "../../features/auth/usePermission";
import { useToast } from "../../features/ui/useToast";

// 5 nhóm khoa/phòng cố định theo model backend (khoa.model.js) -- dùng làm
// lựa chọn dropdown thay vì để tự gõ tay, tránh gõ sai/lệch chính tả giữa các khoa.
const NHOM_OPTIONS = [
  "KHỐI PHÒNG / BAN",
  "HỆ CẬN LÂM SÀNG",
  "HỆ NGOẠI",
  "HỆ NỘI",
  "TRUNG TÂM",
];

interface FormState {
  id?: number;
  ten_khoa: string;
  nhom: string;
}

// Mục: CRUD danh mục khoa/phòng (khoa) -- tách riêng khỏi CauHinhKhoaViTri.tsx
// (trang đó chỉ cấu hình khoa nào cần kiểm tra vị trí nào, không tạo/sửa/xoá
// chính khoa/phòng).
export default function CauHinhKhoaPhong() {
  const dispatch = useAppDispatch();
  const isViewOnly = useIsViewOnly();
  const toast = useToast();

  const [rows, setRows] = useState<Khoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fNhom, setFNhom] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Khoa | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchKhoaList({ active: "all" })
      .then((res) => setRows(res.rows))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách khoa/phòng",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      rows
        .filter((k) => (showHidden ? true : k.active !== 0))
        .filter(
          (k) =>
            !fName || k.ten_khoa.toLowerCase().includes(fName.toLowerCase()),
        )
        .filter((k) => !fNhom || k.nhom === fNhom)
        .sort(
          (a, b) =>
            (a.nhom || "").localeCompare(b.nhom || "", "vi") ||
            a.ten_khoa.localeCompare(b.ten_khoa, "vi"),
        ),
    [rows, fName, fNhom, showHidden],
  );

  const nhomList = useMemo(() => {
    const set = new Set(rows.map((k) => k.nhom).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [rows]);

  async function handleSubmit() {
    if (!form) return;
    if (!form.ten_khoa.trim())
      return setFormError("Vui lòng nhập tên khoa/phòng!");
    setSaving(true);
    setFormError(null);
    try {
      const wasEdit = !!form.id;
      await createUpdateKhoa({
        id: form.id,
        ten_khoa: form.ten_khoa.trim(),
        nhom: form.nhom || null,
      });
      setForm(null);
      load();
      dispatch(loadCatalog()); // refresh cache dùng chung (select khoa ở mọi trang)
      toast.success(wasEdit ? "Đã lưu thay đổi khoa/phòng!" : "Đã thêm khoa/phòng mới!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại!";
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
      await deleteKhoa(deleting.id);
      setDeleting(null);
      load();
      dispatch(loadCatalog());
      toast.success("Đã xoá (ẩn) khoa/phòng!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ẩn thất bại!";
      setError(msg);
      setDeleting(null);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleRestore(k: Khoa) {
    setRestoringId(k.id);
    try {
      await createUpdateKhoa({
        id: k.id,
        ten_khoa: k.ten_khoa,
        nhom: k.nhom,
        active: 1,
      });
      load();
      dispatch(loadCatalog());
      toast.success("Đã khôi phục khoa/phòng!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Khôi phục thất bại!";
      setError(msg);
      toast.error(msg);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<Building2 size={22} />}
        title="Quản lý khoa / phòng"
        subtitle="Danh mục khoa/phòng toàn viện — dùng chung cho đánh giá, lịch, tài khoản..."
        actions={
          !isViewOnly && (
            <button
              className={btnPrimary}
              onClick={() => {
                setFormError(null);
                setForm({ ten_khoa: "", nhom: "" });
              }}
            >
              <Plus size={15} /> Thêm khoa/phòng
            </button>
          )
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

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
              placeholder="Tên khoa/phòng..."
              value={fName}
              onChange={(e) => setFName(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Nhóm">
          <select
            className={inputCls}
            value={fNhom}
            onChange={(e) => setFNhom(e.target.value)}
          >
            <option value="">— Tất cả —</option>
            {nhomList.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          Hiện cả khoa đã ẩn
        </label>
        <button
          className={btnSecondary}
          onClick={() => {
            setFName("");
            setFNhom("");
            setShowHidden(false);
          }}
        >
          <RotateCcw size={15} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">
          {filtered.length} khoa/phòng
        </span>
      </div>

      {loading ? (
        <LoadingRow text="Đang tải danh sách khoa/phòng..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          message="Không có khoa/phòng nào khớp bộ lọc."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
                <th className="px-4 py-3 font-medium">Tên khoa/phòng</th>
                <th className="px-4 py-3 font-medium">Nhóm</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 dark:border-gray-800 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                    {k.ten_khoa}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {k.nhom || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        k.active === 1
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${k.active === 1 ? "bg-emerald-500" : "bg-gray-300"}`}
                      />
                      {k.active === 1 ? "Đang dùng" : "Đã ẩn"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isViewOnly && (
                      <div className="flex justify-end gap-1.5">
                        {k.active === 1 ? (
                          <>
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                              title="Sửa"
                              onClick={() => {
                                setFormError(null);
                                setForm({
                                  id: k.id,
                                  ten_khoa: k.ten_khoa,
                                  nhom: k.nhom || "",
                                });
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                              title="Ẩn"
                              onClick={() => setDeleting(k)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            className={btnSecondary}
                            disabled={restoringId === k.id}
                            onClick={() => handleRestore(k)}
                          >
                            {restoringId === k.id
                              ? "Đang khôi phục..."
                              : "Khôi phục"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        💡 Ẩn khoa/phòng chỉ ẩn đi (không mất dữ liệu lịch sử đánh giá/khắc phục
        đã gắn với khoa đó) — có thể khôi phục lại bất kỳ lúc nào bằng cách tick
        "Hiện cả khoa đã ẩn".
      </p>

      <Modal
        open={!!form}
        title={form?.id ? "Sửa khoa/phòng" : "Thêm khoa/phòng"}
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
              <Check size={14} /> {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        {form && (
          <div className="grid grid-cols-1 gap-4">
            {formError && <ErrorBanner message={formError} />}
            <Field label="Tên khoa/phòng *">
              <input
                className={inputCls}
                value={form.ten_khoa}
                onChange={(e) => setForm({ ...form, ten_khoa: e.target.value })}
                placeholder="VD: Khoa Nội tổng hợp Lão khoa"
              />
            </Field>
            <Field label="Nhóm">
              <select
                className={inputCls}
                value={form.nhom}
                onChange={(e) => setForm({ ...form, nhom: e.target.value })}
              >
                <option value="">— Chọn nhóm —</option>
                {NHOM_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        title="Ẩn khoa/phòng"
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
              <Trash2 size={14} /> {deleteBusy ? "Đang ẩn..." : "Ẩn khoa/phòng"}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn chắc chắn muốn ẩn khoa/phòng <b>{deleting?.ten_khoa}</b>? Các tài
          khoản, lịch, đánh giá đã gắn với khoa này vẫn giữ nguyên dữ liệu nhưng
          khoa sẽ không còn hiện ra ở các select chọn khoa nữa.
        </p>
      </Modal>
    </div>
  );
}
