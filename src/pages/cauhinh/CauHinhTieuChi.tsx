import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertTriangle,
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
  Modal,
  useCatalog,
} from "../../components/ui/PageShell";
import SearchableSelect from "../../components/ui/SearchableSelect";
import {
  fetchChecklistItems,
  createUpdateChecklistItem,
  deleteChecklistItem,
} from "../../features/qlcl/api";
import type { ChecklistItem } from "../../features/qlcl/types";

// 5 nhom S co dinh - dong bo mau voi Bang kiem / du lieu seed (checklistItem.data.json)
const S_GROUPS = [
  { id: "S1", name: "Sàng lọc", color: "#D85A30", lt: "#FAECE7" },
  { id: "S2", name: "Sắp xếp", color: "#BA7517", lt: "#FAEEDA" },
  { id: "S3", name: "Sạch sẽ", color: "#1D9E75", lt: "#E1F5EE" },
  { id: "S4", name: "Săn sóc", color: "#185FA5", lt: "#E6F1FB" },
  { id: "S5", name: "Sẵn sàng", color: "#534AB7", lt: "#EEEDFE" },
] as const;

type SGroupMeta = (typeof S_GROUPS)[number];

interface FormState {
  id?: number;
  s_id: string;
  s_name: string;
  s_color: string;
  s_lt: string;
  sub: string;
  tc: string;
  thu_tu: number;
}

const TAT_CA_VI_TRI_LABEL = "Tất cả vị trí";

// Muc 4: CRUD tieu chi bang kiem (checklist_item) -- MOI vi tri danh gia co bo
// tieu chi RIENG cua minh (khong con dung chung/ap dung dong loat cho ca 20 vi
// tri nhu truoc). Vi tri "Tat ca vi tri" la 1 vi tri dac biet chua bo tieu chi
// mau/tong hop, dung de tham khao khi cau hinh cac vi tri khac.
export default function CauHinhTieuChi() {
  const { vitriTypes, status: catalogStatus } = useCatalog();

  const [selectedVitriId, setSelectedVitriId] = useState<number | "">("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<ChecklistItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mac dinh mo trang se chon vi tri "Tat ca vi tri" (neu co); neu chua tung
  // tao thi fallback ve vi tri dau tien trong danh sach.
  useEffect(() => {
    if (selectedVitriId !== "" || vitriTypes.length === 0) return;
    const tatCa = vitriTypes.find((v) => v.ten_vitri === TAT_CA_VI_TRI_LABEL);
    setSelectedVitriId((tatCa ?? vitriTypes[0]).id);
  }, [vitriTypes, selectedVitriId]);

  const load = useCallback(() => {
    if (selectedVitriId === "") {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchChecklistItems(selectedVitriId)
      .then((res) => setItems(res.rows.filter((r) => r.active !== 0)))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách tiêu chí",
        ),
      )
      .finally(() => setLoading(false));
  }, [selectedVitriId]);

  useEffect(load, [load]);

  const groups = useMemo(
    () =>
      S_GROUPS.map((g) => ({
        ...g,
        items: items
          .filter((it) => it.s_id === g.id)
          .sort((a, b) => a.thu_tu - b.thu_tu),
      })),
    [items],
  );

  const selectedVitriName =
    vitriTypes.find((v) => v.id === selectedVitriId)?.ten_vitri ?? "";

  function openAdd(g: SGroupMeta) {
    if (selectedVitriId === "") return;
    setFormError(null);
    const maxThuTu = Math.max(
      0,
      ...items.filter((it) => it.s_id === g.id).map((it) => it.thu_tu || 0),
    );
    setForm({
      s_id: g.id,
      s_name: g.name,
      s_color: g.color,
      s_lt: g.lt,
      sub: "",
      tc: "",
      thu_tu: maxThuTu + 1,
    });
  }

  function openEdit(it: ChecklistItem) {
    setFormError(null);
    setForm({
      id: it.id,
      s_id: it.s_id,
      s_name: it.s_name,
      s_color: it.s_color,
      s_lt: it.s_lt,
      sub: it.sub || "",
      tc: it.tc,
      thu_tu: it.thu_tu,
    });
  }

  async function handleSubmit() {
    if (!form) return;
    if (!form.tc.trim())
      return setFormError("Vui lòng nhập nội dung tiêu chí!");
    if (selectedVitriId === "")
      return setFormError("Chưa chọn vị trí đánh giá!");
    setSaving(true);
    setFormError(null);
    try {
      if (form.id) {
        // Sua: chi cap nhat dung 1 dong cua vi tri dang chon
        await createUpdateChecklistItem({
          id: form.id,
          sub: form.sub.trim() || null,
          tc: form.tc.trim(),
          thu_tu: form.thu_tu,
        });
      } else {
        // Them moi: chi tao 1 dong cho DUNG vi tri dang chon
        await createUpdateChecklistItem({
          vitri_type_id: Number(selectedVitriId),
          s_id: form.s_id,
          s_name: form.s_name,
          s_color: form.s_color,
          s_lt: form.s_lt,
          sub: form.sub.trim() || null,
          tc: form.tc.trim(),
          thu_tu: form.thu_tu,
        });
      }
      setForm(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lưu thất bại!");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteChecklistItem(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Xóa thất bại!");
    } finally {
      setDeleteBusy(false);
    }
  }

  const isLoading =
    catalogStatus === "loading" || catalogStatus === "idle" || loading;

  return (
    <div>
      <PageHeader
        icon={<ListChecks size={22} />}
        title="Cấu hình tiêu chí bảng kiểm - 5S"
        subtitle="Mỗi vị trí đánh giá có bộ tiêu chí riêng -- chọn vị trí bên dưới để xem/sửa đúng bộ tiêu chí của vị trí đó"
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {vitriTypes.length === 0 && catalogStatus === "succeeded" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          Chưa có vị trí đánh giá nào trong hệ thống.{" "}
          <b>Cấu hình {"->"} Vị trí đánh giá</b> để tạo ít nhất 1 vị trí trước
          khi thêm tiêu chí.
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Vị trí đánh giá" className="max-w-md">
          <SearchableSelect
            value={selectedVitriId}
            onChange={(v) => setSelectedVitriId(v === "" ? "" : Number(v))}
            options={vitriTypes.map((v) => ({
              value: v.id,
              label: v.ten_vitri,
            }))}
            placeholder="— Chọn vị trí —"
          />
        </Field>
      </div>

      {isLoading ? (
        <LoadingRow text="Đang tải tiêu chí..." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {groups.map((g) => (
            <div
              key={g.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <div
                className="flex items-center justify-between gap-2 px-4 py-3"
                style={{ backgroundColor: g.lt }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.id}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: g.color }}
                  >
                    {g.name}
                  </span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {g.items.length} tiêu chí
                  </span>
                </div>
                <button
                  className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-white/80 px-2.5 text-xs font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ color: g.color }}
                  disabled={selectedVitriId === ""}
                  onClick={() => openAdd(g)}
                >
                  <Plus size={13} /> Thêm mới
                </button>
              </div>
              {g.items.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  {selectedVitriId === ""
                    ? "Chọn 1 vị trí ở trên để xem tiêu chí."
                    : `Chưa có tiêu chí nào trong nhóm ${g.name} cho vị trí này.`}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {g.items.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        {c.sub && (
                          <p
                            className="text-[11px] font-semibold uppercase tracking-wide"
                            style={{ color: g.color }}
                          >
                            {c.sub}
                          </p>
                        )}
                        <p className="mt-0.5 text-sm leading-snug text-gray-700 dark:text-gray-300">
                          {c.tc}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5 pt-0.5">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700"
                          title="Sửa"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-300 hover:text-red-500 dark:border-gray-700"
                          title="Xóa"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(c);
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
        Xóa tiêu chí là xóa mềm (ẩn khỏi bảng kiểm của vị trí này) -- dữ liệu
        các lượt đánh giá cũ đã dùng tiêu chí này vẫn được giữ nguyên để tra
        cứu báo cáo. Thêm/sửa/xóa chỉ ảnh hưởng tới vị trí đang chọn, không
        ảnh hưởng các vị trí khác.
      </p>

      {/* Modal them / sua tieu chi */}
      <Modal
        open={!!form}
        title={
          form?.id
            ? `Sửa tiêu chí -- ${form.s_id}`
            : `Thêm tiêu chí mới -- ${form?.s_id ?? ""}`
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
              <Check size={14} /> {saving ? "Đang lưu..." : "Lưu"}
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
              Nhóm {form.s_id} -- {form.s_name} · Áp dụng cho vị trí{" "}
              <b>{selectedVitriName}</b>
            </div>
            <Field
              label="Mã tiêu chí con (VD: AT1, 3 Không (1)...)"
              className="sm:col-span-2"
            >
              <input
                className={inputCls}
                value={form.sub}
                onChange={(e) => setForm({ ...form, sub: e.target.value })}
                placeholder="Không bắt buộc"
              />
            </Field>
            <Field label="Thứ tự">
              <input
                type="number"
                className={inputCls}
                value={form.thu_tu}
                onChange={(e) =>
                  setForm({ ...form, thu_tu: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Nội dung tiêu chí *" className="sm:col-span-3">
              <textarea
                className={`${inputCls} h-24 resize-none py-2`}
                value={form.tc}
                onChange={(e) => setForm({ ...form, tc: e.target.value })}
                placeholder="VD: Không có đồ dùng cá nhân của người bệnh/người nhà để lọt xon ngoài khu vực quy định"
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Modal canh bao xoa */}
      <Modal
        open={!!deleting}
        title="Xóa tiêu chí -- cần xác nhận"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setDeleting(null)}>
              Hủy
            </button>
            <button
              className={btnDanger}
              disabled={deleteBusy}
              onClick={handleDelete}
            >
              <Trash2 size={14} />{" "}
              {deleteBusy ? "Đang xóa..." : "Tôi chắc chắn, xóa tiêu chí"}
            </button>
          </>
        }
      >
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Xóa tiêu chí {deleting?.sub && <b>{deleting.sub} -- </b>}
            <b>"{deleting?.tc}"</b> sẽ{" "}
            <b>ảnh hưởng đến báo cáo, bảng tổng hợp và biểu đồ xu hướng</b> của
            riêng vị trí <b>{selectedVitriName}</b> (điểm % nhóm{" "}
            {deleting?.s_id} của các lượt đánh giá liên quan có thể thay đổi
            cách hiển thị). Bạn có chắc chắn muốn xóa?
          </p>
        </div>
        {deleteError && (
          <div className="mt-3">
            <ErrorBanner message={deleteError} />
          </div>
        )}
      </Modal>
    </div>
  );
}
