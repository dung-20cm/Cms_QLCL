// Toàn bộ state + dữ liệu tính toán của trang Bảng kiểm (thông tin đánh giá,
// tra cứu đánh giá đã có, kiểm tra khớp lịch, chấm điểm, ảnh minh chứng, lưu/
// sửa/xoá...) -- tách khỏi index.tsx để component container chỉ còn lo render.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useCatalog, useDanhGia } from "../../components/ui/PageShell";
import { PERMISSION } from "../../features/auth/permissions";
import { useHasPermission } from "../../features/auth/usePermission";
import {
  createDanhGia,
  createPhotoGallery,
  deleteDanhGia,
  deletePhotoGallery,
  fetchChecklistItems,
  fetchDanhGiaById,
  fetchDotDanhGiaList,
  fetchLichPhanCongList,
  fetchPhotoGalleryList,
  updateDanhGia,
  uploadImage,
} from "../../features/qlcl/api";
import type { SScore } from "../../features/qlcl/api";
import { invalidateDanhGia } from "../../features/qlcl/danhGiaSlice";
import { invalidateKhacPhuc } from "../../features/qlcl/khacPhucSlice";
import type {
  ChecklistItem,
  DanhGia,
  DotDanhGia,
  LichPhanCong,
  PhotoGallery,
} from "../../features/qlcl/types";
import { DOT_DANH_GIA_OPTIONS, xepLoaiFromPct } from "../../features/qlcl/types";
import { useKhoaViTri } from "../../features/qlcl/useKhoaViTri";
import { useToast } from "../../features/ui/useToast";
import { TAT_CA_VI_TRI_LABEL } from "./constants";
import { fmtVN, groupByS, lichMatchesDate, todayStr } from "./helpers";
import type { KetQua, LichCheckResult, ViewMode } from "./types";

export function useBangKiemData() {
  const {
    khoaList,
    vitriTypes,
    users,
    status: catalogStatus,
    error: catalogError,
  } = useCatalog();
  const danhGiaCache = useDanhGia();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  // Trưởng khoa/Nhân viên (không có quyền đánh giá CÁC khoa khác) chỉ được chấm
  // bảng kiểm của đúng khoa/phòng mình -- khoá cứng ô chọn khoa, không cho đổi.
  const isScopedToOwnKhoa = !useHasPermission(PERMISSION.DANH_GIA_CAC_KHOA);

  // Đồng đánh giá — cán bộ CÙNG tham gia chấm bảng kiểm này, ngoài người đang
  // đăng nhập (luôn là người đánh giá chính). Chỉ được chọn cán bộ CÙNG khoa/
  // phòng với tài khoản đang đăng nhập (khớp file mẫu: cho chọn nhiều người
  // cùng đánh giá, nhưng giới hạn trong phạm vi khoa/phòng của mình).
  const [dongDanhGiaIds, setDongDanhGiaIds] = useState<number[]>([]);
  const dongDanhGiaOptions = useMemo(
    () => users.filter((u) => u.khoa_id === user?.khoa_id && u.id !== user?.id),
    [users, user?.khoa_id, user?.id],
  );

  // ── Thông tin đánh giá ──
  const [khoaId, setKhoaId] = useState<number | "">("");
  const [vitriTypeId, setVitriTypeId] = useState<number | "">("");
  const [viTriChiTiet, setViTriChiTiet] = useState(""); // nhập tay (khoa chưa cấu hình mã chi tiết)
  const [viTriChiTietIds, setViTriChiTietIds] = useState<number[]>([]); // chọn nhiều từ mã đã cấu hình
  const [ngay, setNgay] = useState(todayStr());
  const [dot, setDot] = useState(DOT_DANH_GIA_OPTIONS[2]); // Định kỳ

  // Đợt đánh giá đang mở (Cấu hình > mục 3); không có đợt nào => fallback options tĩnh
  const [dotList, setDotList] = useState<DotDanhGia[]>([]);
  useEffect(() => {
    fetchDotDanhGiaList({ trang_thai: "dang-mo" })
      .then((res) => {
        setDotList(res.rows);
        if (res.rows.length > 0) setDot(res.rows[0].ten_dot);
      })
      .catch(() => setDotList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dotOptions =
    dotList.length > 0 ? dotList.map((d) => d.ten_dot) : DOT_DANH_GIA_OPTIONS;

  // Vị trí hiển thị theo cấu hình khoa (trang Cấu hình > mục 1)
  const { types: configTypes, maByType, hasConfig } = useKhoaViTri(khoaId);

  // ── Lịch đánh giá (để kiểm tra điều kiện đang chọn có khớp lịch hay không) ──
  const [lichList, setLichList] = useState<LichPhanCong[]>([]);
  useEffect(() => {
    if (!ngay) return;
    fetchLichPhanCongList({ den_ngay: ngay })
      .then((res) => setLichList(res.rows.filter((l) => l.active !== 0)))
      .catch(() => setLichList([]));
  }, [ngay]);

  // ── Bảng kiểm ──
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [ketQua, setKetQua] = useState<Record<number, KetQua>>({});
  const [ghiChu, setGhiChu] = useState<Record<number, string>>({});

  // ── Lưu / sửa / xoá ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<DanhGia | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("new");
  // Đánh giá đã có sẵn khớp đúng điều kiện đang chọn (khoa/vị trí/vị trí chi
  // tiết/đợt/ngày) -- tra trong cache dùng chung (useDanhGia), không cần gọi
  // API riêng để "biết" có hay không.
  const [foundRecord, setFoundRecord] = useState<DanhGia | null>(null);
  // Chi tiết đầy đủ (từng tiêu chí) của foundRecord -- cache list không có,
  // phải gọi riêng fetchDanhGiaById khi cần (xem PageShell useDanhGia + research).
  const [foundDetail, setFoundDetail] = useState<
    (DanhGia & { sScores: SScore[] }) | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const isEditingRef = useRef(false);
  useEffect(() => {
    isEditingRef.current = viewMode === "edit";
  }, [viewMode]);

  // Modal thông báo lỗi khi điều kiện đang chọn KHÔNG khớp Lịch đánh giá
  const [lichModalOpen, setLichModalOpen] = useState(false);

  // Modal cảm ơn tự tắt sau 3s (hoặc người dùng tự bấm x đóng sớm hơn)
  useEffect(() => {
    if (!showSuccessModal) return;
    const timer = setTimeout(() => setShowSuccessModal(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccessModal]);

  // ── Ảnh minh chứng ──
  // `photos`/`photoPreviews` (song song theo index) = ảnh MỚI vừa chọn, CHƯA
  // upload lên server -- xoá khỏi đây chỉ là bỏ chọn cục bộ, không gọi API.
  // `existingPhotos` = ảnh đã lưu trên server của đánh giá đang xem/sửa (tải
  // qua fetchPhotoGalleryList) -- xoá 1 ảnh ở đây gọi API xoá NGAY LẬP TỨC
  // (không đợi bấm "Cập nhật"), đồng bộ luôn với trang Ảnh 5S.
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<PhotoGallery[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [photoStatus, setPhotoStatus] = useState("");

  // User thường: mặc định khoa của mình
  useEffect(() => {
    if (user?.khoa_id && khoaId === "") setKhoaId(user.khoa_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Giống 5S_Dashboard_BVTB_v4.html: mặc định hiển thị luôn bảng kiểm của
  // 1 vị trí thay vì chờ người dùng chọn — ưu tiên vị trí "Tất cả vị trí" (bộ
  // tiêu chí tổng hợp dùng chung) nếu khoa đang chọn có cấu hình vị trí này,
  // nếu không thì lấy vị trí đầu tiên. Đổi khoa mà vị trí đang chọn không
  // thuộc cấu hình mới => tự nhảy về vị trí mặc định hợp lệ. Vẫn chọn được vị
  // trí khác bất kỳ lúc nào qua select bên dưới.
  useEffect(() => {
    if (configTypes.length === 0) return;
    const valid = configTypes.some((v) => v.id === vitriTypeId);
    if (vitriTypeId === "" || !valid) {
      const tatCa = configTypes.find(
        (v) => v.ten_vitri === TAT_CA_VI_TRI_LABEL,
      );
      setVitriTypeId((tatCa ?? configTypes[0]).id);
      setViTriChiTietIds([]);
      setViTriChiTiet("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configTypes]);

  // Đổi vị trí => reset lựa chọn mã chi tiết
  useEffect(() => {
    setViTriChiTietIds([]);
  }, [vitriTypeId]);

  // Đổi vị trí → nạp bảng kiểm tương ứng từ API
  useEffect(() => {
    if (vitriTypeId === "") {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoadingItems(true);
    fetchChecklistItems(Number(vitriTypeId))
      .then((res) => {
        if (cancelled) return;
        setItems([...res.rows].sort((a, b) => a.thu_tu - b.thu_tu));
        if (!isEditingRef.current) {
          setKetQua({});
          setGhiChu({});
        }
        setSaved(null);
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoadingItems(false));
    return () => {
      cancelled = true;
    };
  }, [vitriTypeId]);

  // ── Tra cứu đánh giá đã có sẵn khớp đúng điều kiện đang chọn ──
  // Cho phép quay lại sau (VD sáng đánh giá, chiều mở lại) chỉ cần nhập đúng
  // điều kiện là hệ thống tự nhận ra và hiện lại kết quả để sửa/xoá.
  const matchKey = useMemo(() => {
    if (khoaId === "" || vitriTypeId === "" || !ngay) return null;
    const dotId = dotList.find((d) => d.ten_dot === dot)?.id ?? null;
    const vitriChiTietId = viTriChiTietIds.length === 1 ? viTriChiTietIds[0] : null;
    return {
      khoaId: Number(khoaId),
      vitriTypeId: Number(vitriTypeId),
      vitriChiTietId,
      dotId,
      ngay,
    };
  }, [khoaId, vitriTypeId, viTriChiTietIds, dotList, dot, ngay]);

  useEffect(() => {
    if (isEditingRef.current) return; // đang sửa dở -- không phá dữ liệu đang chấm
    if (!matchKey) {
      setFoundRecord(null);
      setViewMode((m) => (m === "result" ? "new" : m));
      return;
    }
    const match = danhGiaCache.rows.find(
      (r) =>
        r.active !== 0 &&
        r.khoa_id === matchKey.khoaId &&
        r.vitri_type_id === matchKey.vitriTypeId &&
        r.ngay_danh_gia === matchKey.ngay &&
        (matchKey.dotId == null || r.dot_danh_gia_id === matchKey.dotId) &&
        (r.vitri_chi_tiet_id ?? null) === matchKey.vitriChiTietId &&
        // Chỉ nhận lại đánh giá do CHÍNH tài khoản đang đăng nhập tạo -- 2 lịch
        // khác nhau có thể trùng khoa/vị trí/đợt/ngày (VD lịch phòng QLCL đi
        // đánh giá khoa khác VS lịch khoa tự đánh giá) nhưng là 2 luồng độc
        // lập, không được lẫn kết quả của tài khoản khác vào đây.
        r.nguoi_danh_gia_id === user?.id,
    );
    setFoundRecord(match ?? null);
    setViewMode(match ? "result" : "new");
  }, [matchKey, danhGiaCache.rows, user?.id]);

  // Nạp chi tiết từng tiêu chí + ảnh minh chứng đã lưu của foundRecord (cache
  // danh sách không có) -- để sẵn sàng ngay khi người dùng bấm "Sửa", không
  // phải đợi thêm 1 lượt gọi API.
  useEffect(() => {
    if (!foundRecord) {
      setFoundDetail(null);
      setExistingPhotos([]);
      return;
    }
    let cancelled = false;
    fetchDanhGiaById(foundRecord.id)
      .then((full) => {
        if (!cancelled) setFoundDetail(full);
      })
      .catch(() => {
        if (!cancelled) setFoundDetail(null);
      });
    fetchPhotoGalleryList({ danh_gia_id: foundRecord.id })
      .then((res) => {
        if (!cancelled) setExistingPhotos(res.rows);
      })
      .catch(() => {
        if (!cancelled) setExistingPhotos([]);
      });
    return () => {
      cancelled = true;
    };
    // Chỉ phụ thuộc id -- tránh gọi lại API mỗi khi object foundRecord đổi
    // reference (VD sau invalidate) nhưng vẫn cùng 1 bản ghi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundRecord?.id]);

  const groups = useMemo(() => groupByS(items), [items]);

  const stats = useMemo(() => {
    const tong = items.length;
    let dat = 0;
    let danhGiaXong = 0;
    for (const it of items) {
      const kq = ketQua[it.id];
      if (kq !== null && kq !== undefined) danhGiaXong++;
      if (kq === 1) dat++;
    }
    const pct = tong ? Math.round((dat / tong) * 100) : 0;
    return { tong, dat, danhGiaXong, pct };
  }, [items, ketQua]);

  const xl = xepLoaiFromPct(stats.pct);

  // ── Điều kiện đang chọn có khớp Lịch đánh giá hay không ──
  // Kiểm tra theo TỪNG cấp (khoa+ngày -> vị trí -> đợt -> người) để báo đúng
  // NGUYÊN NHÂN sai thay vì chỉ nói chung chung "không khớp lịch".
  const lichCheck = useMemo<LichCheckResult>(() => {
    if (khoaId === "" || vitriTypeId === "" || !ngay || !user) {
      return { ok: false, message: "Cần chọn đầy đủ khoa/phòng, vị trí đánh giá và ngày đánh giá." };
    }
    const khoaTen = khoaList.find((k) => k.id === khoaId)?.ten_khoa || `khoa #${khoaId}`;
    const vitriTen = vitriTypes.find((v) => v.id === vitriTypeId)?.ten_vitri || `vị trí #${vitriTypeId}`;
    const dotId = dotList.find((d) => d.ten_dot === dot)?.id ?? null;
    const evaluatorIds = [user.id, ...dongDanhGiaIds];

    const byKhoaNgay = lichList.filter(
      (l) => l.khoa_id === Number(khoaId) && lichMatchesDate(l, ngay),
    );
    if (byKhoaNgay.length === 0) {
      return {
        ok: false,
        message: `Không tìm thấy lịch đánh giá nào cho "${khoaTen}" vào ngày ${fmtVN(ngay)}. Vui lòng kiểm tra lại trang Lịch đánh giá trước khi chấm.`,
      };
    }
    const byVitri = byKhoaNgay.filter(
      (l) => l.vitri_type_id == null || l.vitri_type_id === Number(vitriTypeId),
    );
    if (byVitri.length === 0) {
      return {
        ok: false,
        message: `Có lịch đánh giá cho "${khoaTen}" vào ngày ${fmtVN(ngay)}, nhưng KHÔNG đúng vị trí đánh giá đang chọn ("${vitriTen}").`,
      };
    }
    const byDot = byVitri.filter((l) => !dotId || l.dot_danh_gia_id === dotId);
    if (byDot.length === 0) {
      return {
        ok: false,
        message: `Có lịch đánh giá đúng khoa + vị trí vào ngày ${fmtVN(ngay)}, nhưng KHÔNG đúng đợt đánh giá đang chọn ("${dot}").`,
      };
    }
    const byNguoi = byDot.filter((l) => evaluatorIds.includes(l.nguoi_thuc_hien_id));
    if (byNguoi.length === 0) {
      return {
        ok: false,
        message: `Có lịch đánh giá đúng khoa + vị trí + đợt vào ngày ${fmtVN(ngay)}, nhưng người đánh giá đang chọn KHÔNG khớp cán bộ được phân công trong lịch.`,
      };
    }
    return { ok: true };
  }, [khoaId, vitriTypeId, ngay, dot, dotList, dongDanhGiaIds, user, lichList, khoaList, vitriTypes]);

  const readyToSave =
    khoaId !== "" &&
    vitriTypeId !== "" &&
    items.length > 0 &&
    stats.danhGiaXong === stats.tong &&
    lichCheck.ok;

  function guardedSetKetQua(itemId: number, kq: KetQua) {
    if (!lichCheck.ok) {
      setLichModalOpen(true);
      return;
    }
    setKetQua((p) => ({ ...p, [itemId]: kq }));
  }

  function guardedSetAll(kq: KetQua) {
    if (!lichCheck.ok) {
      setLichModalOpen(true);
      return;
    }
    const next: Record<number, KetQua> = {};
    for (const it of items) next[it.id] = kq;
    setKetQua(next);
  }

  function handleCreateNew() {
    setKhoaId(isScopedToOwnKhoa ? (user?.khoa_id ?? "") : "");
    setVitriTypeId("");
    setViTriChiTiet("");
    setViTriChiTietIds([]);
    setNgay(todayStr());
    setDot(dotList[0]?.ten_dot ?? DOT_DANH_GIA_OPTIONS[2]);
    setDongDanhGiaIds([]);
    setKetQua({});
    setGhiChu({});
    setSaved(null);
    setSaveError(null);
    setShowSuccessModal(false);
    setPhotos([]);
    setPhotoPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });
    setExistingPhotos([]);
    setPhotoStatus("");
    setFoundRecord(null);
    setFoundDetail(null);
    setViewMode("new");
  }

  // Ảnh MỚI chọn (chưa upload) -- chỉ hiện preview cục bộ, chưa gọi API nào.
  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setPhotos((p) => [...p, ...arr]);
    setPhotoPreviews((p) => [...p, ...arr.map((f) => URL.createObjectURL(f))]);
  }

  // Bỏ 1 ảnh vừa chọn (chưa upload) -- chỉ bỏ khỏi danh sách cục bộ.
  function removeQueuedPhoto(idx: number) {
    setPhotos((p) => p.filter((_, i) => i !== idx));
    setPhotoPreviews((p) => {
      URL.revokeObjectURL(p[idx]);
      return p.filter((_, i) => i !== idx);
    });
  }

  // Xoá 1 ảnh ĐÃ LƯU trên server -- gọi API xoá ngay (không đợi bấm "Cập
  // nhật"), đồng bộ ngay với trang Ảnh 5S vì cùng 1 nguồn dữ liệu.
  async function removeExistingPhoto(photoId: number) {
    setDeletingPhotoId(photoId);
    try {
      await deletePhotoGallery(photoId);
      setExistingPhotos((p) => p.filter((ph) => ph.id !== photoId));
      toast.success("Đã xoá ảnh minh chứng!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xoá ảnh thất bại!";
      toast.error(msg);
    } finally {
      setDeletingPhotoId(null);
    }
  }

  function enterEditMode() {
    if (!foundDetail) return;
    const kq: Record<number, KetQua> = {};
    const gc: Record<number, string> = {};
    for (const s of foundDetail.sScores) {
      for (const it of s.items) {
        kq[it.checklist_item_id] = it.ket_qua;
        if (it.ghi_chu) gc[it.checklist_item_id] = it.ghi_chu;
      }
    }
    setKetQua(kq);
    setGhiChu(gc);
    const dgIds = foundRecord?.dong_danh_gia_ids
      ? foundRecord.dong_danh_gia_ids
          .split(",")
          .map(Number)
          .filter((id) => id !== user?.id)
      : [];
    setDongDanhGiaIds(dgIds);
    setSaveError(null);
    setViewMode("edit");
  }

  async function handleSave() {
    if (!user || khoaId === "" || vitriTypeId === "") return;
    setSaving(true);
    setSaveError(null);
    try {
      // Nhãn vị trí chi tiết: từ các mã đã chọn (cấu hình) hoặc text nhập tay
      const selectedMa = (maByType.get(Number(vitriTypeId)) || [])
        .filter((r) => viTriChiTietIds.includes(r.id))
        .map((r) => r.ma_vitri);
      const chiTietLabel =
        selectedMa.length > 0 ? selectedMa.join(", ") : viTriChiTiet;
      const payload = {
        khoa_id: Number(khoaId),
        vitri_type_id: Number(vitriTypeId),
        // chọn đúng 1 mã cấu hình => lưu kèm id để trace về vitri_chi_tiet
        vitri_chi_tiet_id:
          viTriChiTietIds.length === 1 ? viTriChiTietIds[0] : null,
        nguoi_danh_gia_id: user.id,
        dong_danh_gia_ids: dongDanhGiaIds.length
          ? dongDanhGiaIds.join(",")
          : null,
        ngay_danh_gia: ngay,
        dot_danh_gia: chiTietLabel ? `${dot} — ${chiTietLabel}` : dot,
        // liên kết đợt cấu hình (bảng dot_danh_gia) nếu đang chọn 1 đợt từ danh sách
        dot_danh_gia_id: dotList.find((d) => d.ten_dot === dot)?.id ?? null,
        chi_tiet: items.map((it) => ({
          checklist_item_id: it.id,
          ket_qua: ketQua[it.id] ?? null,
          ghi_chu: ghiChu[it.id] || undefined,
        })),
      };

      const isEdit = viewMode === "edit" && !!foundRecord;
      const rec = isEdit
        ? await updateDanhGia(foundRecord!.id, payload)
        : await createDanhGia(payload);

      dispatch(invalidateDanhGia());
      dispatch(invalidateKhacPhuc());

      if (isEdit) {
        toast.success("Đã cập nhật đánh giá!");
        setViewMode("result");
      } else {
        setSaved(rec);
        setShowSuccessModal(true);
        toast.success("Đã lưu lượt đánh giá mới!");
      }

      // Upload ảnh minh chứng MỚI (nếu có) gắn vào lượt đánh giá -- ảnh đã lưu
      // từ trước (existingPhotos) không đụng tới, chỉ thêm ảnh vừa chọn thêm.
      if (photos.length > 0 && rec?.id) {
        let ok = 0;
        const total = photos.length;
        for (const f of photos) {
          try {
            const { url } = await uploadImage(f);
            if (url) {
              const created = await createPhotoGallery({
                danh_gia_id: rec.id,
                url_anh: url,
                ten_file: f.name,
                mime_type: f.type,
              });
              setExistingPhotos((prev) => [...prev, created]);
              ok++;
            }
          } catch {
            /* bỏ qua ảnh lỗi, không chặn luồng lưu */
          }
          setPhotoStatus(`Đã tải lên ${ok}/${total} ảnh`);
        }
        setPhotos([]);
        setPhotoPreviews((prev) => {
          prev.forEach((u) => URL.revokeObjectURL(u));
          return [];
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại, vui lòng thử lại!";
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!foundRecord) return;
    setDeleting(true);
    try {
      await deleteDanhGia(foundRecord.id);
      dispatch(invalidateDanhGia());
      dispatch(invalidateKhacPhuc());
      toast.success("Đã xoá đánh giá!");
      setConfirmDeleteOpen(false);
      handleCreateNew();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xoá thất bại!";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  const isResultToday = foundRecord?.ngay_danh_gia === todayStr();
  const showChecklist = viewMode !== "result";
  // Chỉ CHÍNH tài khoản đã tạo đánh giá này mới thấy nút Sửa/Xoá -- không xét
  // vai trò/quyền, kể cả Admin/Trưởng khoa cũng không được sửa/xoá đánh giá do
  // tài khoản khác tạo (khớp check ownership ở backend danhGia.service.js).
  const canEditDelete = foundRecord?.nguoi_danh_gia_id === user?.id;

  return {
    navigate,
    khoaList,
    vitriTypes,
    catalogStatus,
    catalogError,
    isScopedToOwnKhoa,
    dongDanhGiaIds,
    setDongDanhGiaIds,
    dongDanhGiaOptions,
    khoaId,
    setKhoaId,
    vitriTypeId,
    setVitriTypeId,
    viTriChiTiet,
    setViTriChiTiet,
    viTriChiTietIds,
    setViTriChiTietIds,
    ngay,
    setNgay,
    dot,
    setDot,
    dotList,
    dotOptions,
    configTypes,
    maByType,
    hasConfig,
    items,
    loadingItems,
    ketQua,
    ghiChu,
    setGhiChu,
    saving,
    saveError,
    saved,
    showSuccessModal,
    setShowSuccessModal,
    viewMode,
    setViewMode,
    foundRecord,
    foundDetail,
    deleting,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    lichModalOpen,
    setLichModalOpen,
    photos,
    photoPreviews,
    existingPhotos,
    deletingPhotoId,
    photoStatus,
    user,
    groups,
    stats,
    xl,
    lichCheck,
    readyToSave,
    guardedSetKetQua,
    guardedSetAll,
    handleCreateNew,
    addPhotos,
    removeQueuedPhoto,
    removeExistingPhoto,
    enterEditMode,
    handleSave,
    handleDelete,
    isResultToday,
    showChecklist,
    canEditDelete,
  };
}

export type BangKiemData = ReturnType<typeof useBangKiemData>;
