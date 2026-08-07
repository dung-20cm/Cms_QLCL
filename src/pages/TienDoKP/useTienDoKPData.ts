// Toàn bộ state + dữ liệu tính toán của trang Tiến độ khắc phục (tải theo
// tuần, bộ lọc, phân trang, modal thêm/sửa + gợi ý AI, xoá...) -- tách khỏi
// index.tsx để component container chỉ còn lo render.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useCatalog } from "../../components/ui/PageShell";
import { usePagination } from "../../components/ui/Pagination";
import { PERMISSION } from "../../features/auth/permissions";
import { useHasPermission, useIsViewOnly } from "../../features/auth/usePermission";
import { smartSuggestKP, suggestDeadline } from "../../features/qlcl/aiSuggestKP";
import {
  createUpdateKhacPhuc,
  deleteKhacPhuc,
  fetchKhacPhucList,
} from "../../features/qlcl/api";
import { invalidateKhacPhuc } from "../../features/qlcl/khacPhucSlice";
import type { KhacPhuc } from "../../features/qlcl/types";
import { useToast } from "../../features/ui/useToast";
import { addDays, emptyForm, fmt, isQuaHan, startOfWeek, workDaysPassed } from "./helpers";
import type { KpForm } from "./types";

export function useTienDoKPData() {
  const isViewOnly = useIsViewOnly();
  const toast = useToast();
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
      tt: kp.trang_thai || "Chưa bắt đầu",
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
      const wasEdit = !!editingId;
      await createUpdateKhacPhuc(payload);
      closeModal();
      dispatch(invalidateKhacPhuc());
      load();
      toast.success(wasEdit ? "Đã lưu thay đổi hành động khắc phục!" : "Đã thêm hành động khắc phục mới!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại";
      setModalError(msg);
      toast.error(msg);
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
      toast.success("Đã xoá hành động khắc phục!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xoá thất bại";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  return {
    isViewOnly,
    users,
    khoaList,
    vitriTypes,
    isFullScope,
    weekStart,
    setWeekStart,
    weekEnd,
    load,
    loading,
    error,
    fTT,
    setFTT,
    fKhoa,
    setFKhoa,
    filtered,
    page,
    setPage,
    totalPages,
    pagedRows,
    pageSize,
    totalItems,
    kpi,
    modalOpen,
    editingId,
    editingKp,
    form,
    setForm,
    saving,
    modalError,
    locked,
    aiLoading,
    aiSuggestion,
    aiHan,
    openAdd,
    openEdit,
    closeModal,
    effectiveLoiText,
    getAISuggest,
    applyAISuggest,
    save,
    confirmDelete,
    setConfirmDelete,
    deleting,
    deleteError,
    doDelete,
  };
}

export type TienDoKPData = ReturnType<typeof useTienDoKPData>;
