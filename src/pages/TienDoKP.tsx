import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wrench,
  RotateCcw,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  PageHeader,
  KpiCard,
  Field,
  Modal,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
} from "../components/ui/PageShell";
import SearchableSelect from "../components/ui/SearchableSelect";
import Pagination, { usePagination } from "../components/ui/Pagination";
import {
  createUpdateKhacPhuc,
  deleteKhacPhuc,
  fetchKhacPhucList,
} from "../features/qlcl/api";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { invalidateKhacPhuc } from "../features/qlcl/khacPhucSlice";
import type { KhacPhuc } from "../features/qlcl/types";
import { smartSuggestKP, suggestDeadline } from "../features/qlcl/aiSuggestKP";
import { PERMISSION } from "../features/auth/permissions";
import { useHasPermission } from "../features/auth/usePermission";

const TRANG_THAI = ["Chưa bắt đầu", "Đang xử lý", "Đã xong"];
const S_IDS = ["S1", "S2", "S3", "S4", "S5"];
const S_META: Record<string, { name: string; color: string; bg: string }> = {
  S1: { name: "Sàng lọc", color: "#D85A30", bg: "#FAECE7" },
  S2: { name: "Sắp xếp", color: "#BA7517", bg: "#FAEEDA" },
  S3: { name: "Sạch sẽ", color: "#1D9E75", bg: "#E1F5EE" },
  S4: { name: "Săn sóc", color: "#185FA5", bg: "#E6F1FB" },
  S5: { name: "Sẵn sàng", color: "#534AB7", bg: "#EEEDFE" },
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=CN
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
// Giờ địa phương -- không dùng toISOString() vì quy đổi UTC dễ lệch ngày (VN = UTC+7)
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fmtVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const tuanLabelFromDate = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  const w = Math.ceil(d.getDate() / 7);
  return `Tuần ${w} - ${d.getMonth() + 1}/${d.getFullYear()}`;
};

// Số ngày LÀM VIỆC (bỏ T7/CN) đã trôi qua kể từ ngày phát hiện tới hôm nay
function workDaysPassed(dateStr: string): number {
  const from = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  const d = new Date(from);
  while (d.getTime() < today.getTime()) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function ttBadge(tt: string, quaHan: boolean) {
  if (tt === "Đã xong")
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (quaHan)
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  if (tt === "Đang xử lý")
    return "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400";
  return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
}

const isQuaHan = (kp: KhacPhuc) =>
  kp.trang_thai !== "Đã xong" &&
  !!kp.han_xu_ly &&
  kp.han_xu_ly < new Date().toISOString().slice(0, 10);

function soNgayConLai(hanXuLy: string | null): number | null {
  if (!hanXuLy) return null;
  const han = new Date(`${hanXuLy}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((han.getTime() - today.getTime()) / 86400000);
}

function ProgressBar5({ r }: { r: KhacPhuc }) {
  if (r.trang_thai === "Đã xong") {
    return (
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        ✓ Đã hoàn thành
      </span>
    );
  }
  const detected = r.ngay_phat_hien || r.createdAt?.slice(0, 10);
  if (!detected) return <span className="text-xs text-gray-300">—</span>;
  const passed = workDaysPassed(detected);
  const pct = Math.min(100, (passed / 5) * 100);
  const color = passed >= 5 ? "#E24B4A" : passed >= 3 ? "#BA7517" : "#1D9E75";
  const label =
    passed >= 5
      ? `Hết 5 ngày LV (${passed} ngày đã qua)`
      : `Còn ${5 - passed} ngày LV`;
  return (
    <div style={{ minWidth: 100 }}>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <p className="mt-1 text-[11px]" style={{ color }}>
        {passed}/5 · {label}
      </p>
    </div>
  );
}

interface KpForm {
  khoa: string;
  vitri: string;
  sId: string;
  ngayPhatHien: string;
  moTaLoi: string;
  hanhDong: string;
  nguoi: number | "";
  han: string;
  tuan: string;
  tt: string;
  ghiChu: string;
}

function emptyForm(): KpForm {
  const today = fmt(new Date());
  return {
    khoa: "",
    vitri: "",
    sId: "S1",
    ngayPhatHien: today,
    moTaLoi: "",
    hanhDong: "",
    nguoi: "",
    han: fmt(addDays(new Date(), 7)),
    tuan: tuanLabelFromDate(today),
    tt: TRANG_THAI[0],
    ghiChu: "",
  };
}

export default function TienDoKP() {
  const { users, khoaList, vitriTypes } = useCatalog();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  // Full-scope (Admin/Phòng QLCL) chọn khoa tự do; Trưởng khoa/Nhân viên chỉ
  // quản lý khắc phục của khoa mình (backend cũng chặn nếu cố tạo/sửa khoa khác).
  const isFullScope = useHasPermission(
    PERMISSION.XEM_TIEN_DO_KHAC_PHUC_TAT_CA_KHOA,
  );

  // ── Tải dữ liệu THEO TUẦN đang xem (giống Lịch đánh giá) -- tránh tải toàn
  // bộ bảng khac_phuc mỗi lần mở trang. Không dùng cache Redux dùng chung
  // (khacPhucSlice) vì cache đó không có tham số ngày; sau khi tạo/sửa/xoá ở
  // đây vẫn dispatch invalidateKhacPhuc() để các trang khác (Thống kê, Báo
  // cáo) dùng cache đó tự làm mới.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [rows, setRows] = useState<KhacPhuc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const weekEnd = addDays(weekStart, 6);
    fetchKhacPhucList({ tu_ngay: fmt(weekStart), den_ngay: fmt(weekEnd) })
      .then((res) => setRows(res.rows.filter((r) => r.active !== 0)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được dữ liệu"),
      )
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(load, [load]);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const [fTT, setFTT] = useState("");
  const [fKhoa, setFKhoa] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (fKhoa && String(r.khoa_id) !== fKhoa) return false;
        if (fTT === "Quá hạn") return isQuaHan(r);
        if (fTT && r.trang_thai !== fTT) return false;
        return true;
      }),
    [rows, fTT, fKhoa],
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedRows,
    pageSize,
    totalItems,
  } = usePagination(filtered, {
    resetKey: `${fmt(weekStart)}|${fTT}|${fKhoa}`,
  });

  const kpi = useMemo(
    () => ({
      total: filtered.length,
      done: filtered.filter((r) => r.trang_thai === "Đã xong").length,
      doing: filtered.filter((r) => r.trang_thai === "Đang xử lý").length,
      over: filtered.filter(isQuaHan).length,
      chuaKP: filtered.filter((r) => {
        if (r.hanh_dong_khac_phuc?.trim()) return false;
        if (r.trang_thai === "Đã xong") return false;
        const detected = r.ngay_phat_hien || r.createdAt?.slice(0, 10);
        if (!detected) return false;
        return workDaysPassed(detected) >= 5;
      }).length,
    }),
    [filtered],
  );

  // ── Modal Thêm / Sửa ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingKp, setEditingKp] = useState<KhacPhuc | null>(null);
  const [form, setForm] = useState<KpForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Hành động tạo tự động khi lưu Bảng kiểm (có danh_gia_chi_tiet_id) đã gắn
  // với 1 tiêu chí đánh giá cụ thể -- khoá Khoa/Vị trí/S/Ngày phát hiện/Mô tả
  // lỗi (hiển thị thông tin gốc, không cho đổi); chỉ hành động tạo tay mới
  // được sửa các trường này.
  const locked = !!editingKp?.danh_gia_chi_tiet_id;

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiHan, setAiHan] = useState<Date | null>(null);

  function openAdd() {
    const f = emptyForm();
    if (!isFullScope && currentUser?.khoa_id != null) {
      f.khoa = String(currentUser.khoa_id);
    }
    setForm(f);
    setEditingId(null);
    setEditingKp(null);
    setAiSuggestion(null);
    setAiHan(null);
    setModalError(null);
    setModalOpen(true);
  }

  function openEdit(kp: KhacPhuc) {
    setForm({
      khoa: kp.khoa_id != null ? String(kp.khoa_id) : "",
      vitri: kp.vitri_type_id != null ? String(kp.vitri_type_id) : "",
      sId: kp.s_id || "S1",
      ngayPhatHien: kp.ngay_phat_hien || "",
      moTaLoi: kp.mo_ta_loi || "",
      hanhDong: kp.hanh_dong_khac_phuc || "",
      nguoi: kp.nguoi_phu_trach_id ?? "",
      han: kp.han_xu_ly?.slice(0, 10) || "",
      tuan: kp.tuan || "",
      tt: kp.trang_thai || TRANG_THAI[0],
      ghiChu: kp.ghi_chu || "",
    });
    setEditingId(kp.id);
    setEditingKp(kp);
    setAiSuggestion(null);
    setAiHan(null);
    setModalError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setEditingKp(null);
  }

  // Nội dung lỗi + mã S dùng để tư vấn -- lấy từ tiêu chí gốc nếu là hành động
  // tự tạo (khoá), hoặc từ form nếu tạo tay.
  const effectiveLoiText = locked
    ? editingKp?.danh_gia_chi_tiet?.checklist_item?.tc || ""
    : form.moTaLoi;
  const effectiveSId = locked
    ? editingKp?.danh_gia_chi_tiet?.checklist_item?.s_id || "S1"
    : form.sId;

  function getAISuggest() {
    if (!effectiveLoiText.trim()) return;
    setAiLoading(true);
    setAiSuggestion(null);
    // Độ trễ giả lập "đang tư vấn" -- đây là gợi ý theo luật từ khoá cục bộ
    // (xem aiSuggestKP.ts), không gọi mô hình AI thật qua mạng.
    setTimeout(() => {
      setAiSuggestion(smartSuggestKP(effectiveLoiText, effectiveSId));
      setAiHan(suggestDeadline());
      setAiLoading(false);
    }, 400);
  }

  function applyAISuggest() {
    if (!aiSuggestion) return;
    setForm((f) => ({ ...f, hanhDong: aiSuggestion }));
  }

  async function save() {
    if (!locked) {
      if (!form.khoa || !form.vitri || !form.sId || !form.moTaLoi.trim()) {
        setModalError(
          "Vui lòng nhập đủ Khoa/Phòng, Vị trí, Mã S và Mô tả lỗi.",
        );
        return;
      }
    }
    setSaving(true);
    setModalError(null);
    try {
      const payload: Partial<KhacPhuc> & { id?: number } = {
        hanh_dong_khac_phuc: form.hanhDong,
        nguoi_phu_trach_id: form.nguoi === "" ? null : Number(form.nguoi),
        han_xu_ly: form.han || null,
        tuan: form.tuan || null,
        trang_thai: form.tt,
        ghi_chu: form.ghiChu || null,
      };
      if (editingId) payload.id = editingId;
      if (!locked) {
        payload.khoa_id = Number(form.khoa);
        payload.vitri_type_id = Number(form.vitri);
        payload.s_id = form.sId;
        payload.mo_ta_loi = form.moTaLoi;
        payload.ngay_phat_hien = form.ngayPhatHien || null;
      }
      await createUpdateKhacPhuc(payload);
      closeModal();
      dispatch(invalidateKhacPhuc());
      load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // ── Modal xác nhận xoá (thay window.confirm -- có thể bị trình duyệt chặn/
  // ẩn ở 1 số môi trường, và không đồng bộ giao diện với phần còn lại của app) ──
  const [confirmDelete, setConfirmDelete] = useState<KhacPhuc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteKhacPhuc(confirmDelete.id);
      dispatch(invalidateKhacPhuc());
      setConfirmDelete(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Xoá thất bại");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<Wrench size={22} />}
        title="Theo dõi tiến độ khắc phục"
        subtitle="Tổng hợp lỗi phát hiện qua đánh giá — cập nhật tiến độ khắc phục hàng tuần"
        actions={
          <button className={btnPrimary} onClick={openAdd}>
            <Plus size={15} /> Thêm hành động KP
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-5">
        <KpiCard
          label="Tổng hành động"
          value={kpi.total}
          sub="tuần đang xem"
          accent="navy"
        />
        <KpiCard label="Đã xong" value={kpi.done} accent="green" />
        <KpiCard label="Đang xử lý" value={kpi.doing} accent="blue" />
        <KpiCard
          label="⚠ Quá hạn"
          value={kpi.over}
          sub="cần xử lý ngay"
          accent="red"
        />
        <KpiCard
          label="⚠ Chưa KP ≥5 ngày LV"
          value={kpi.chuaKP}
          sub="cần xử lý ngay"
          accent="yellow"
        />
      </div>

      {/* ── Điều hướng tuần + bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Tuần đang xem">
          <div className="flex items-center gap-2">
            <button
              className={btnSecondary}
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              title="Tuần trước"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-200">
              {fmtVN(weekStart)} – {fmtVN(weekEnd)}/{weekEnd.getFullYear()}
            </p>
            <button
              className={btnSecondary}
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              title="Tuần sau"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className={btnSecondary}
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Tuần này
            </button>
          </div>
        </Field>
        {/* Trưởng khoa/Nhân viên chỉ xem được đúng khoa mình (đã lọc sẵn ở
            backend) -- ẩn hẳn ô chọn khoa để tránh gây hiểu lầm có thể xem
            khoa khác. Chỉ Admin/Phòng QLCL (isFullScope) mới cần chọn khoa. */}
        {isFullScope && (
          <Field label="Khoa / Phòng" className="min-w-[220px]">
            <SearchableSelect
              value={fKhoa}
              onChange={(v) => setFKhoa(v)}
              options={khoaList.map((k) => ({
                value: String(k.id),
                label: k.ten_khoa,
              }))}
              placeholder="— Tất cả khoa —"
            />
          </Field>
        )}
        <Field label="Trạng thái">
          <select
            className={inputCls}
            value={fTT}
            onChange={(e) => setFTT(e.target.value)}
          >
            <option value="">— Tất cả —</option>
            {TRANG_THAI.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option>Quá hạn</option>
          </select>
        </Field>
        <button
          className={btnSecondary}
          onClick={() => {
            setFTT("");
            setFKhoa("");
          }}
        >
          <RotateCcw size={14} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">
          Hành động KP được tạo tự động cho mọi tiêu chí ✗ khi lưu Bảng kiểm —
          hoặc bấm "Thêm hành động KP" để tạo tay
        </span>
      </div>

      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench size={36} />}
          message="Chưa có hành động khắc phục nào trong tuần này"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">
                    Khoa / Vị trí / S / Lỗi phát hiện
                  </th>
                  <th className="px-4 py-3 font-medium">Hành động khắc phục</th>
                  <th className="px-4 py-3 font-medium">Người phụ trách</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    📅 Ngày phát hiện
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    ⏱ Tiến độ (5 ngày LV)
                  </th>
                  <th className="px-4 py-3 font-medium">Hạn xử lý</th>
                  <th className="px-4 py-3 font-medium">Tuần</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => {
                  const dgct = r.danh_gia_chi_tiet;
                  const sId = r.s_id || dgct?.checklist_item?.s_id;
                  const sMeta = sId ? S_META[sId] : undefined;
                  const loiText =
                    r.mo_ta_loi ||
                    dgct?.checklist_item?.tc ||
                    dgct?.ghi_chu ||
                    "—";
                  const quaHan = isQuaHan(r);
                  const conLai = soNgayConLai(r.han_xu_ly);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-gray-50 align-top last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                    >
                      <td className="max-w-[280px] px-5 py-3">
                        <p className="font-medium text-gray-700 dark:text-gray-200">
                          {r.khoa?.ten_khoa || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {r.vitri_type?.ten_vitri}
                          {sMeta && (
                            <span
                              className="ml-1 rounded px-1 py-0.5 text-[10px] font-semibold"
                              style={{
                                background: sMeta.bg,
                                color: sMeta.color,
                              }}
                            >
                              {sId} · {sMeta.name}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {loiText}
                        </p>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-gray-600 dark:text-gray-300">
                        {r.hanh_dong_khac_phuc || (
                          <span className="text-gray-300">Chưa cập nhật</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {r.nguoi_phu_trach?.email ||
                          r.nguoi_phu_trach?.username ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {r.ngay_phat_hien
                          ? new Date(r.ngay_phat_hien).toLocaleDateString(
                              "vi-VN",
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar5 r={r} />
                      </td>
                      <td
                        className={`px-4 py-3 ${quaHan ? "font-semibold text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                      >
                        {r.han_xu_ly
                          ? new Date(r.han_xu_ly).toLocaleDateString("vi-VN")
                          : "—"}
                        {conLai != null && r.trang_thai !== "Đã xong" && (
                          <p className="mt-0.5 text-[11px] font-normal">
                            {conLai < 0
                              ? `Quá hạn ${Math.abs(conLai)} ngày`
                              : conLai === 0
                                ? "Hết hạn hôm nay"
                                : `Còn ${conLai} ngày`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {r.tuan}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${ttBadge(r.trang_thai, quaHan)}`}
                        >
                          {quaHan ? `⚠ Quá hạn` : r.trang_thai}
                        </span>
                      </td>
                      <td className="max-w-[160px] px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {r?.ghi_chu ? (
                          <p className="line-clamp-2">{r.ghi_chu}</p>
                        ) : (
                          <p className="line-clamp-2">
                            {r?.danh_gia_chi_tiet?.ghi_chu || "—"}
                          </p>
                          // <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(r)}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700"
                            title="Cập nhật tiến độ"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(r)}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:border-red-300 hover:text-red-600 dark:border-gray-700"
                            title="Xoá hành động"
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

      {/* ── Modal Thêm / Sửa hành động khắc phục ── */}
      <Modal
        open={modalOpen}
        title={
          editingId
            ? "Cập nhật hành động khắc phục"
            : "Thêm hành động khắc phục"
        }
        onClose={closeModal}
        wide
        footer={
          <>
            <button className={btnSecondary} onClick={closeModal}>
              Huỷ
            </button>
            <button className={btnPrimary} onClick={save} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          {locked ? (
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <p>
                <span className="font-semibold">
                  {editingKp?.khoa?.ten_khoa}
                </span>
                {" · "}
                {editingKp?.vitri_type?.ten_vitri}
                {editingKp?.danh_gia_chi_tiet?.checklist_item?.s_id && (
                  <>
                    {" · "}
                    <span className="font-semibold">
                      {editingKp.danh_gia_chi_tiet.checklist_item.s_id}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1">
                {editingKp?.danh_gia_chi_tiet?.checklist_item?.tc}
              </p>
              <p className="mt-1 text-gray-400">
                Phát sinh tự động từ Bảng kiểm — không đổi được Khoa/Vị trí/Mã
                S/Ngày phát hiện.
                {editingKp?.ngay_phat_hien &&
                  ` Ngày phát hiện: ${new Date(editingKp.ngay_phat_hien).toLocaleDateString("vi-VN")}.`}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Khoa / Phòng / TT">
                  <SearchableSelect
                    value={form.khoa}
                    onChange={(v) => setForm((f) => ({ ...f, khoa: v }))}
                    options={khoaList.map((k) => ({
                      value: String(k.id),
                      label: k.ten_khoa,
                    }))}
                    placeholder="— Chọn khoa —"
                    disabled={!isFullScope}
                  />
                </Field>
                <Field label="Vị trí đánh giá">
                  <SearchableSelect
                    value={form.vitri}
                    onChange={(v) => setForm((f) => ({ ...f, vitri: v }))}
                    options={vitriTypes.map((v) => ({
                      value: String(v.id),
                      label: v.ten_vitri,
                    }))}
                    placeholder="— Chọn vị trí —"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mã S (tiêu chí lỗi)">
                  <select
                    className={inputCls}
                    value={form.sId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sId: e.target.value }))
                    }
                  >
                    {S_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id} – {S_META[id].name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="📅 Ngày phát hiện lỗi">
                  <input
                    type="date"
                    className={inputCls}
                    value={form.ngayPhatHien}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ngayPhatHien: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <Field label="Mô tả lỗi / tiêu chí chưa đạt">
                <textarea
                  className={`${inputCls} h-20 resize-y py-2`}
                  value={form.moTaLoi}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, moTaLoi: e.target.value }))
                  }
                  placeholder="Mô tả cụ thể lỗi/tiêu chí 5S chưa đạt..."
                />
              </Field>
            </>
          )}

          <Field label="Hành động khắc phục (AI gợi ý bên dưới)">
            <textarea
              className={`${inputCls} h-24 resize-y py-2`}
              value={form.hanhDong}
              onChange={(e) =>
                setForm((f) => ({ ...f, hanhDong: e.target.value }))
              }
              placeholder="Điền hoặc bấm 'Tư vấn AI' bên dưới để lấy gợi ý..."
            />
          </Field>
          <div>
            <button
              type="button"
              className={btnSecondary}
              onClick={getAISuggest}
              disabled={aiLoading || !effectiveLoiText.trim()}
            >
              <Sparkles size={14} />{" "}
              {aiLoading ? "Đang tư vấn AI..." : "💡 Tư vấn AI"}
            </button>
          </div>
          {aiSuggestion && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm dark:border-teal-500/30 dark:bg-teal-500/10">
              <p className="font-semibold text-teal-700 dark:text-teal-400">
                💡 Gợi ý từ AI
              </p>
              <p className="mt-1 text-gray-600 dark:text-gray-300">
                {aiSuggestion}
              </p>
              {aiHan && (
                <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">
                  ⏰ Hạn đề xuất: {aiHan.toLocaleDateString("vi-VN")} (7 ngày
                  làm việc)
                </p>
              )}
              <button
                type="button"
                className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700"
                onClick={applyAISuggest}
              >
                Áp dụng gợi ý này
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Người chịu trách nhiệm">
              <select
                className={inputCls}
                value={form.nguoi}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    nguoi: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              >
                <option value="">— Chưa gán —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email || u.username}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hạn hoàn thành">
              <input
                type="date"
                className={inputCls}
                value={form.han}
                onChange={(e) =>
                  setForm((f) => ({ ...f, han: e.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Tuần theo dõi">
            <input
              type="text"
              className={inputCls}
              value={form.tuan}
              onChange={(e) => setForm((f) => ({ ...f, tuan: e.target.value }))}
              placeholder="VD: Tuần 1 - 6/2026"
            />
          </Field>
          <Field label="Trạng thái">
            <div className="flex gap-2">
              {TRANG_THAI.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, tt: t }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    form.tt === t
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Ghi chú cập nhật">
            <textarea
              className={`${inputCls} h-20 resize-y py-2`}
              value={form.ghiChu}
              onChange={(e) =>
                setForm((f) => ({ ...f, ghiChu: e.target.value }))
              }
              placeholder="Tiến độ cụ thể, kết quả..."
            />
          </Field>
          {modalError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              ✗ {modalError}
            </p>
          )}
        </div>
      </Modal>

      {/* ── Modal xác nhận xoá ── */}
      <Modal
        open={!!confirmDelete}
        title="Xoá hành động khắc phục"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <button
              className={btnSecondary}
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
            >
              Huỷ
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              onClick={doDelete}
              disabled={deleting}
            >
              {deleting ? "Đang xoá..." : "Xoá hành động"}
            </button>
          </>
        }
      >
        {confirmDelete && (
          <div className="grid gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Bạn có chắc chắn muốn xoá hành động khắc phục này? Hành động này
              không thể hoàn tác.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
              <p className="font-medium text-gray-700 dark:text-gray-200">
                {confirmDelete.khoa?.ten_khoa} ·{" "}
                {confirmDelete.vitri_type?.ten_vitri}
              </p>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                {confirmDelete.hanh_dong_khac_phuc ||
                  confirmDelete.danh_gia_chi_tiet?.checklist_item?.tc ||
                  confirmDelete.mo_ta_loi}
              </p>
            </div>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                ✗ {deleteError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
