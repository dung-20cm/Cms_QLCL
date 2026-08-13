// Toàn bộ state + dữ liệu tính toán của trang Ảnh 5S (bộ lọc, lightbox,
// form thêm/sửa, xoá, phân trang, xuất PPTX...) -- tách khỏi index.tsx để
// component container chỉ còn lo phần render.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { useCatalog, useKhacPhuc } from "../../components/ui/PageShell";
import { usePagination } from "../../components/ui/Pagination";
import { useIsViewOnly } from "../../features/auth/usePermission";
import {
  createPhotoGallery,
  deletePhotoGallery,
  fetchPhotoGalleryList,
  photoImageUrl,
  updatePhotoGallery,
  uploadImage,
} from "../../features/qlcl/api";
import {
  exportAnh5SPpt,
  type Anh5SPptRecord,
} from "../../features/qlcl/exportAnh5SPpt";
import type { PhotoGallery } from "../../features/qlcl/types";
import { useToast } from "../../features/ui/useToast";
import {
  emptyForm,
  failedItemsFor as failedItemsForRows,
  isPassGroup,
  manualGroupKey,
  pctFromKetQua,
  todayStr,
} from "./helpers";
import type { FormState, PhotoGroup } from "./types";

export function useAnh5SData() {
  const isViewOnly = useIsViewOnly();
  const toast = useToast();
  const { khoaList, vitriTypes, users } = useCatalog();
  const user = useAppSelector((s) => s.auth.user);
  // Danh sách khắc phục (cache dùng chung) -- chỉ dùng để tra tiêu chí KHÔNG
  // ĐẠT của 1 lượt đánh giá thật (khac_phuc tự tạo 1 dòng cho mỗi tiêu chí ✗
  // khi lưu Bảng kiểm), hiển thị trong card ảnh giống file mẫu.
  const { rows: khacPhucRows } = useKhacPhuc();
  const [photos, setPhotos] = useState<PhotoGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bo loc
  const [fKhoa, setFKhoa] = useState("");
  const [fLoai, setFLoai] = useState(""); // '', 'dat', 'khdat'
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fNguoi, setFNguoi] = useState("");

  function resetFilters() {
    setFKhoa("");
    setFLoai("");
    setFFrom("");
    setFTo("");
    setFNguoi("");
  }

  // Select "Nhân viên" chỉ hiện đúng nhân viên của khoa đang lọc (fKhoa) thay vì
  // luôn liệt kê toàn bộ user hệ thống -- khi chưa chọn khoa thì vẫn hiện tất cả.
  const nguoiFilterOptions = useMemo(() => {
    const list = fKhoa
      ? users.filter((u) => String(u.khoa_id) === fKhoa)
      : users;
    return list.map((u) => ({
      value: String(u.id),
      label: u.email || u.username || "—",
    }));
  }, [users, fKhoa]);

  // Lightbox xem nhiều ảnh cùng 1 lượt gửi -- trượt qua lại bằng react-slick
  const [previewList, setPreviewList] = useState<PhotoGallery[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const preview = previewList ? previewList[previewIndex] : null;

  function openPreview(list: PhotoGallery[], startIndex: number) {
    setPreviewList(list);
    setPreviewIndex(startIndex);
  }
  function closePreview() {
    setPreviewList(null);
    setPreviewIndex(0);
  }

  // Dong lightbox bang phim Esc
  useEffect(() => {
    if (!previewList) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewList]);

  // Them / sua anh
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState("");

  // Xoa -- dung chung cho xoa 1 anh hoac xoa ca luot gui thu cong
  const [deleting, setDeleting] = useState<{
    ids: number[];
    label: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Xuat PPTX
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPhotoGalleryList()
      .then((res) => setPhotos(res.rows.filter((p) => p.active !== 0)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được ảnh"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      const dg = p.danh_gia;
      const khoaId = dg ? dg.khoa_id : p.khoa_id;
      const pct = dg ? dg.pct : pctFromKetQua(p.ket_qua);
      const ngay =
        dg?.ngay_danh_gia || p.ngay_chup || p.createdAt?.slice(0, 10);
      // Nguoi thuc hien: anh tu Bang kiem lay nguoi_danh_gia, anh gui doc lap lay nguoi_gui
      const nguoiId = dg ? dg.nguoi_danh_gia?.id : p.nguoi_gui_id;
      if (fKhoa && String(khoaId) !== fKhoa) return false;
      if (fLoai === "dat" && pct < 60) return false;
      if (fLoai === "khdat" && pct >= 60) return false;
      if (fFrom && ngay && ngay < fFrom) return false;
      if (fTo && ngay && ngay > fTo) return false;
      if (fNguoi && String(nguoiId ?? "") !== fNguoi) return false;
      return true;
    });
  }, [photos, fKhoa, fLoai, fFrom, fTo, fNguoi]);

  const kpi = useMemo(() => {
    const luotIds = new Set(
      filtered.map((p) =>
        p.danh_gia_id ? `dg-${p.danh_gia_id}` : manualGroupKey(p),
      ),
    );
    const dat = filtered.filter(
      (p) => (p.danh_gia ? p.danh_gia.pct : pctFromKetQua(p.ket_qua)) >= 60,
    );
    return {
      luot: luotIds.size,
      dat: dat.length,
      khdat: filtered.length - dat.length,
      total: filtered.length,
    };
  }, [filtered]);

  // Gom anh theo luot: luot tu Bang kiem (danh_gia_id) hoac luot gui thu cong (manualGroupKey)
  const groups = useMemo(() => {
    const map = new Map<string, PhotoGroup>();
    for (const p of filtered) {
      const key = p.danh_gia_id ? `dg-${p.danh_gia_id}` : manualGroupKey(p);
      if (!map.has(key)) {
        map.set(
          key,
          p.danh_gia_id
            ? { key, type: "eval", dg: p.danh_gia, list: [] }
            : { key, type: "manual", manual: p, list: [] },
        );
      }
      map.get(key)!.list.push(p);
    }
    return [...map.values()].sort((a, b) => {
      const da = a.dg?.ngay_danh_gia || a.manual?.ngay_chup || "";
      const db = b.dg?.ngay_danh_gia || b.manual?.ngay_chup || "";
      return db.localeCompare(da);
    });
  }, [filtered]);

  function failedItemsFor(danhGiaId: number) {
    return failedItemsForRows(khacPhucRows, danhGiaId);
  }

  // Phân trang theo LƯỢT (10 lượt/trang) -- áp trên `groups` (đã sort mới nhất
  // trước) rồi mới gom theo ngày để hiển thị, tránh 1 trang chỉ toàn 1 ngày.
  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedGroups,
    pageSize,
    totalItems,
  } = usePagination(groups, {
    pageSize: 10,
    resetKey: `${fKhoa}|${fLoai}|${fFrom}|${fTo}|${fNguoi}`,
  });

  // Nhóm các lượt (của TRANG hiện tại) theo NGÀY (giống file mẫu
  // 5S_Dashboard_BVTB_v4: mỗi ngày là 1 khối riêng, hiện tổng số lượt/ảnh + số
  // đạt/chưa đạt trong ngày đó).
  const dateGroups = useMemo(() => {
    const map = new Map<string, PhotoGroup[]>();
    for (const g of pagedGroups) {
      const key =
        g.dg?.ngay_danh_gia ||
        g.manual?.ngay_chup ||
        g.list[0]?.createdAt?.slice(0, 10) ||
        "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [pagedGroups]);

  // -- Them anh moi --
  function openAdd() {
    setFormError(null);
    setForm(emptyForm(user?.id ?? ""));
  }

  // Sửa 1 lượt -- áp dụng cho CẢ 2 loại (ảnh tự gắn khi lưu Bảng kiểm lẫn ảnh
  // gửi độc lập): với lượt đánh giá thật, Khoa/Vị trí/Ngày/Kết quả lấy từ
  // chính đánh giá đó (khoá, không sửa được ở đây) -- chỉ sửa được ghi chú và
  // quản lý ảnh (thêm/gỡ bớt).
  function openEdit(g: PhotoGroup) {
    const list = g.list;
    const first = list[0];
    setFormError(null);
    if (g.type === "eval" && g.dg) {
      const dg = g.dg;
      const nguoiList = [
        dg.nguoi_danh_gia?.username,
        ...(dg.dong_danh_gia?.map((u) => u.username) || []),
      ]
        .filter(Boolean)
        .join(", ");
      setForm({
        editKey: `dg-${dg.id}`,
        editIds: list.map((p) => p.id),
        locked: true,
        danhGiaId: dg.id,
        lockedInfo: {
          khoa: dg.khoa?.ten_khoa || "",
          vitri: dg.vitri_type?.ten_vitri || "—",
          ngay: dg.ngay_danh_gia
            ? new Date(dg.ngay_danh_gia).toLocaleDateString("vi-VN")
            : "",
          ketQua: `${dg.pct}% ${dg.xep_loai}`,
          nguoi: nguoiList || "—",
        },
        khoa_id: dg.khoa_id,
        vitri_type_id: dg.vitri_type_id ?? "",
        ngay_chup: dg.ngay_danh_gia || todayStr(),
        nguoi_gui_id: "",
        ket_qua: "",
        ghi_chu: first.ghi_chu || "",
        existingPhotos: list,
        newFiles: [],
      });
    } else {
      setForm({
        editKey: manualGroupKey(first),
        editIds: list.map((p) => p.id),
        locked: false,
        khoa_id: first.khoa_id ?? "",
        vitri_type_id: first.vitri_type_id ?? "",
        ngay_chup: first.ngay_chup || todayStr(),
        nguoi_gui_id: first.nguoi_gui_id ?? "",
        ket_qua: first.ket_qua || "",
        ghi_chu: first.ghi_chu || "",
        existingPhotos: list,
        newFiles: [],
      });
    }
  }

  function removeExistingPhoto(id: number) {
    setForm((f) =>
      f
        ? { ...f, existingPhotos: f.existingPhotos.filter((p) => p.id !== id) }
        : f,
    );
  }

  function addFiles(files: FileList | null) {
    if (!files || !form) return;
    setForm({ ...form, newFiles: [...form.newFiles, ...Array.from(files)] });
  }

  function removeNewFile(idx: number) {
    setForm((f) =>
      f ? { ...f, newFiles: f.newFiles.filter((_, i) => i !== idx) } : f,
    );
  }

  async function handleSubmit() {
    if (!form) return;
    if (!form.locked) {
      if (form.khoa_id === "") return setFormError("Vui lòng chọn khoa/phòng!");
      if (!form.ket_qua)
        return setFormError(
          "Vui lòng chọn kết quả (Đạt tốt / Đạt / Chưa đạt)!",
        );
    }
    const totalPhotos = form.existingPhotos.length + form.newFiles.length;
    if (totalPhotos === 0) return setFormError("Vui lòng chọn ít nhất 1 ảnh!");

    setSaving(true);
    setFormError(null);
    try {
      // Ảnh gắn với 1 lượt đánh giá thật: chỉ sửa được ghi chú (khoa/vị
      // trí/ngày/kết quả khoá theo đánh giá gốc, không gửi lên để tránh ghi
      // đè dữ liệu không áp dụng cho loại ảnh này).
      const meta = form.locked
        ? { ghi_chu: form.ghi_chu.trim() || null }
        : {
            khoa_id: Number(form.khoa_id),
            vitri_type_id:
              form.vitri_type_id === "" ? null : Number(form.vitri_type_id),
            ngay_chup: form.ngay_chup || null,
            nguoi_gui_id:
              form.nguoi_gui_id === "" ? null : Number(form.nguoi_gui_id),
            ket_qua: form.ket_qua,
            ghi_chu: form.ghi_chu.trim() || null,
          };

      // Cap nhat metadata cho cac anh cu giu lai (khi sua 1 luot gui da co)
      if (form.editIds) {
        const keepIds = new Set(form.existingPhotos.map((p) => p.id));
        for (const id of form.editIds) {
          if (keepIds.has(id)) {
            setSaveProgress("Đang cập nhật thông tin...");
            await updatePhotoGallery({ id, ...meta });
          } else {
            setSaveProgress("Đang xoá ảnh đã gỡ...");
            await deletePhotoGallery(id);
          }
        }
      }

      // Ngữ cảnh đặt tên file dễ quản lý (VD "Ptchc_dungpt_12082026_anh1") --
      // khoa lấy theo form.khoa_id (đã khoá đúng khoa của đánh giá gốc ở
      // nhánh "locked"), người: nếu gắn với 1 lượt đánh giá thì luôn là tài
      // khoản đang đăng nhập (quyền sở hữu ảnh minh chứng), nếu ảnh gửi độc
      // lập thì ưu tiên người được chọn ở ô "Người gửi", rơi về tài khoản
      // đang đăng nhập nếu chưa chọn.
      const khoaTenForUpload = khoaList.find(
        (k) => k.id === Number(form.khoa_id),
      )?.ten_khoa;
      const usernameForUpload = form.locked
        ? user?.username
        : (users.find((u) => u.id === Number(form.nguoi_gui_id))?.username ??
          user?.username);

      // Upload + tao ban ghi cho anh moi chon them
      for (let i = 0; i < form.newFiles.length; i++) {
        const f = form.newFiles[i];
        setSaveProgress(`Đang tải ảnh ${i + 1}/${form.newFiles.length}...`);
        const { url, mimeType } = await uploadImage(f, {
          khoaTen: khoaTenForUpload,
          username: usernameForUpload,
          ngay: form.ngay_chup,
          index: form.existingPhotos.length + i + 1,
        });
        if (!url) throw new Error(`Tải ảnh "${f.name}" thất bại`);
        // Dùng mimeType backend trả về (loại file THẬT SỰ sau khi resize/nén,
        // luôn "image/jpeg" trừ .svg) -- không dùng lại f.type gốc phía client
        // vì có thể sai (VD ảnh .png gốc bị nén thành .jpg).
        if (form.locked && form.danhGiaId) {
          await createPhotoGallery({
            danh_gia_id: form.danhGiaId,
            ghi_chu: form.ghi_chu.trim() || null,
            url_anh: url,
            ten_file: f.name,
            mime_type: mimeType || f.type,
          });
        } else {
          await createPhotoGallery({
            ...meta,
            url_anh: url,
            ten_file: f.name,
            mime_type: mimeType || f.type,
          });
        }
      }

      const wasEdit = !!form.editIds;
      setForm(null);
      setSaveProgress("");
      load();
      toast.success(wasEdit ? "Đã lưu thay đổi ảnh!" : "Đã thêm ảnh mới!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại!";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      setSaveProgress("");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await Promise.all(deleting.ids.map((id) => deletePhotoGallery(id)));
      setDeleting(null);
      // Neu anh vua xoa nam trong lightbox dang mo, dong lightbox luon (tranh slider
      // lech state voi danh sach anh da bi rut bot).
      if (previewList && previewList.some((p) => deleting.ids.includes(p.id)))
        closePreview();
      load();
      toast.success("Đã xoá ảnh!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xoá thất bại!";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleExportPpt() {
    setExportError(null);
    setExporting(true);
    try {
      const records: Anh5SPptRecord[] = groups.map((g) => {
        const dg = g.dg;
        const manual = g.manual;
        const pct = dg ? dg.pct : pctFromKetQua(manual?.ket_qua ?? null);
        const tagLabel = dg ? dg.xep_loai : manual?.ket_qua || "";
        return {
          khoa: dg?.khoa?.ten_khoa || manual?.khoa?.ten_khoa || "Không rõ",
          vitri:
            dg?.vitri_type?.ten_vitri || manual?.vitri_type?.ten_vitri || "—",
          ngay: dg?.ngay_danh_gia || manual?.ngay_chup || "",
          nguoi:
            dg?.nguoi_danh_gia?.username || manual?.nguoi_gui?.username || "",
          pct,
          tagLabel,
          photos: g.list
            .filter((p) => p.url_anh)
            .map((p) => ({ url: photoImageUrl(p.id), name: p.ten_file || "" })),
        };
      });
      const rangeLabel =
        fFrom || fTo
          ? `${fFrom || "..."} → ${fTo || "..."}`
          : "Toàn bộ dữ liệu";
      await exportAnh5SPpt(records, rangeLabel);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Xuất PPTX thất bại!",
      );
    } finally {
      setExporting(false);
    }
  }

  return {
    isViewOnly,
    khoaList,
    vitriTypes,
    users,
    loading,
    error,
    load,
    fKhoa,
    setFKhoa,
    fLoai,
    setFLoai,
    fFrom,
    setFFrom,
    fTo,
    setFTo,
    fNguoi,
    setFNguoi,
    resetFilters,
    nguoiFilterOptions,
    previewList,
    previewIndex,
    setPreviewIndex,
    preview,
    openPreview,
    closePreview,
    form,
    setForm,
    formError,
    saving,
    saveProgress,
    deleting,
    setDeleting,
    deleteBusy,
    deleteError,
    exporting,
    exportError,
    handleExportPpt,
    kpi,
    groups,
    failedItemsFor,
    isPassGroup,
    page,
    setPage,
    totalPages,
    pageSize,
    totalItems,
    dateGroups,
    openAdd,
    openEdit,
    removeExistingPhoto,
    addFiles,
    removeNewFile,
    handleSubmit,
    handleDelete,
  };
}

export type Anh5SData = ReturnType<typeof useAnh5SData>;
