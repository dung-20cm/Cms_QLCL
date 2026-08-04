import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Check,
  X,
  RotateCcw,
  Save,
  Camera,
  PartyPopper,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { invalidateDanhGia } from "../features/qlcl/danhGiaSlice";
import { invalidateKhacPhuc } from "../features/qlcl/khacPhucSlice";
import {
  PageHeader,
  Field,
  Modal,
  inputCls,
  btnPrimary,
  btnSecondary,
  btnDanger,
  LoadingRow,
  ErrorBanner,
  useCatalog,
  useDanhGia,
} from "../components/ui/PageShell";
import SearchableSelect from "../components/ui/SearchableSelect";
import MultiSelect from "../components/ui/MultiSelect";
import {
  fetchChecklistItems,
  fetchDotDanhGiaList,
  fetchLichPhanCongList,
  fetchDanhGiaById,
  createDanhGia,
  updateDanhGia,
  deleteDanhGia,
  uploadImage,
  createPhotoGallery,
  fetchPhotoGalleryList,
  deletePhotoGallery,
} from "../features/qlcl/api";
import type { SScore } from "../features/qlcl/api";
import type { DotDanhGia, LichPhanCong, PhotoGallery } from "../features/qlcl/types";
import type { ChecklistItem, DanhGia } from "../features/qlcl/types";
import {
  DOT_DANH_GIA_OPTIONS,
  xepLoaiFromPct,
  toneBadgeClass,
} from "../features/qlcl/types";
import { useKhoaViTri } from "../features/qlcl/useKhoaViTri";
import { useToast } from "../features/ui/useToast";
import { PERMISSION } from "../features/auth/permissions";
import { useHasPermission } from "../features/auth/usePermission";

type KetQua = 0 | 1 | null;
type ViewMode = "new" | "result" | "edit";

interface SGroup {
  s_id: string;
  s_name: string;
  s_color: string;
  s_lt: string;
  items: ChecklistItem[];
}

function groupByS(items: ChecklistItem[]): SGroup[] {
  const map = new Map<string, SGroup>();
  for (const it of items) {
    if (!map.has(it.s_id)) {
      map.set(it.s_id, {
        s_id: it.s_id,
        s_name: it.s_name,
        s_color: it.s_color,
        s_lt: it.s_lt,
        items: [],
      });
    }
    map.get(it.s_id)!.items.push(it);
  }
  return [...map.values()];
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtVN = (dateStr: string) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("vi-VN");

// Vị trí tổng hợp (bộ tiêu chí dùng chung) — ưu tiên chọn mặc định khi có, xem
// trang Cấu hình > Tiêu chí.
const TAT_CA_VI_TRI_LABEL = "Tất cả vị trí";

// Mốc ngày bắt đầu áp dụng thực tế của 1 lịch định kỳ -- xem cùng logic ở
// LichDanhGia.tsx (effectiveStartDate) để 2 trang luôn tính khớp nhau.
function effectiveStartDate(l: LichPhanCong): string | null {
  if (l.ngay_thuc_hien) return l.ngay_thuc_hien;
  return l.createdAt ? l.createdAt.slice(0, 10) : null;
}

// 1 lịch có áp dụng cho đúng ngày `dateStr` hay không -- định kỳ lặp theo thứ
// trong tuần kể từ effectiveStartDate, một lần/đột xuất phải khớp đúng ngày.
function lichMatchesDate(l: LichPhanCong, dateStr: string): boolean {
  if (l.loai_lich === "dinh_ky") {
    const thu = new Date(`${dateStr}T00:00:00`).getDay();
    const thuNum = thu === 0 ? 7 : thu;
    if (l.thu_trong_tuan !== thuNum) return false;
    const startBound = effectiveStartDate(l);
    return !startBound || dateStr >= startBound;
  }
  return l.ngay_thuc_hien === dateStr;
}

interface LichCheckResult {
  ok: boolean;
  message?: string;
}

export default function BangKiem() {
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

  if (catalogStatus === "loading" || catalogStatus === "idle")
    return <LoadingRow />;

  const isResultToday = foundRecord?.ngay_danh_gia === todayStr();
  const showChecklist = viewMode !== "result";
  // Chỉ CHÍNH tài khoản đã tạo đánh giá này mới thấy nút Sửa/Xoá -- không xét
  // vai trò/quyền, kể cả Admin/Trưởng khoa cũng không được sửa/xoá đánh giá do
  // tài khoản khác tạo (khớp check ownership ở backend danhGia.service.js).
  const canEditDelete = foundRecord?.nguoi_danh_gia_id === user?.id;

  return (
    <div>
      <PageHeader
        icon={<ClipboardList size={22} />}
        title="Bảng kiểm đánh giá 5S"
        subtitle="Chọn khoa + vị trí → chấm từng tiêu chí → lưu kết quả về máy chủ"
      />
      {catalogError && <ErrorBanner message={catalogError} />}

      {/* ── Thông tin đánh giá ── */}
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Khoa / Phòng / Trung tâm">
            <SearchableSelect
              value={khoaId}
              onChange={setKhoaId}
              options={khoaList.map((k) => ({
                value: k.id,
                label: k.ten_khoa,
              }))}
              placeholder="— Chọn khoa —"
              disabled={isScopedToOwnKhoa}
            />
            {isScopedToOwnKhoa && (
              <p className="mt-1 text-[11px] text-gray-400">
                Bạn chỉ chấm được bảng kiểm của khoa/phòng mình.
              </p>
            )}
          </Field>
          <Field
            label={`Vị trí đánh giá ${khoaId !== "" && hasConfig ? "" : ""}`}
          >
            <select
              className={inputCls}
              value={vitriTypeId}
              onChange={(e) =>
                setVitriTypeId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— Chọn vị trí —</option>
              {configTypes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.ten_vitri}
                </option>
              ))}
            </select>
          </Field>
          {vitriTypeId !== "" &&
          (maByType.get(Number(vitriTypeId))?.length ?? 0) > 0 ? (
            <Field label="Vị trí chi tiết">
              <MultiSelect
                values={viTriChiTietIds}
                onChange={setViTriChiTietIds}
                options={maByType.get(Number(vitriTypeId))!.map((r) => ({
                  value: r.id,
                  label: r.ma_vitri,
                }))}
                placeholder="— Chọn vị trí chi tiết —"
                selectedText={(n) => `${n} vị trí đã chọn`}
              />
            </Field>
          ) : (
            <Field label="Vị trí chi tiết (buồng số, phòng số...)">
              <input
                className={inputCls}
                value={viTriChiTiet}
                onChange={(e) => setViTriChiTiet(e.target.value)}
                placeholder="VD: Buồng 3, Phòng mổ 1, Xe số 2..."
              />
            </Field>
          )}
          <Field label="Người đánh giá">
            <MultiSelect
              values={user ? [user.id, ...dongDanhGiaIds] : dongDanhGiaIds}
              onChange={(vals) =>
                setDongDanhGiaIds(vals.filter((id) => id !== user?.id))
              }
              lockedValues={user ? [user.id] : []}
              options={[
                ...(user
                  ? [{ value: user.id, label: user.email || user.username }]
                  : []),
                ...dongDanhGiaOptions.map((u) => ({
                  value: u.id,
                  label: u.email || u.username,
                })),
              ]}
              placeholder="— Chọn người đánh giá —"
            />
          </Field>
          <Field label={`Đợt đánh giá${dotList.length > 0 ? "" : ""}`}>
            <select
              className={inputCls}
              value={dot}
              onChange={(e) => setDot(e.target.value)}
            >
              {dotOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Ngày đánh giá">
            <input
              type="date"
              className={inputCls}
              max={todayStr()}
              value={ngay}
              onChange={(e) => {
                const v = e.target.value;
                setNgay(v > todayStr() ? todayStr() : v);
              }}
            />
          </Field>
        </div>
      </div>

      {viewMode === "result" && foundRecord ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Đã có kết quả đánh giá — {foundRecord.pct}% ({foundRecord.xep_loai})
          </p>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
            {isResultToday
              ? "Bạn chỉ có thể sửa hoặc xoá đánh giá này trong ngày hiện tại — sang ngày hôm sau sẽ bị khoá."
              : "Đánh giá này đã qua ngày đánh giá, không thể sửa/xoá được nữa — chỉ xem."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={handleCreateNew}>
              Tạo đánh giá mới
            </button>
            {canEditDelete && isResultToday && (
              <>
                <button
                  className={btnSecondary}
                  onClick={enterEditMode}
                  disabled={!foundDetail}
                >
                  <Pencil size={14} /> Sửa
                </button>
                <button
                  className={btnDanger}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 size={14} /> Xoá
                </button>
              </>
            )}
            <button
              className={btnSecondary}
              onClick={() => navigate("/tong-hop")}
            >
              Xem tổng hợp
            </button>
            <button
              className={btnSecondary}
              onClick={() => navigate("/tien-do-kp")}
            >
              Xem tiến độ khắc phục
            </button>
          </div>
        </div>
      ) : null}

      {showChecklist && (
        <>
          {/* ── Cảnh báo điều kiện chưa khớp Lịch đánh giá ── */}
          {vitriTypeId !== "" && items.length > 0 && !lichCheck.ok && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{lichCheck.message}</p>
            </div>
          )}

          {/* ── Banner vị trí + thao tác nhanh ── */}
          {vitriTypeId !== "" && items.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-25 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/5">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-400">
                📍 {vitriTypes.find((v) => v.id === vitriTypeId)?.ten_vitri}
                {(() => {
                  const sel = (maByType.get(Number(vitriTypeId)) || [])
                    .filter((r) => viTriChiTietIds.includes(r.id))
                    .map((r) => r.ma_vitri);
                  const label = sel.length > 0 ? sel.join(", ") : viTriChiTiet;
                  return label ? (
                    <span className="text-brand-500"> · {label}</span>
                  ) : null;
                })()}
                {viewMode === "edit" && (
                  <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Đang sửa
                  </span>
                )}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {items.length} tiêu chí
                </span>
              </p>
              <div className="flex gap-2">
                <button className={btnSecondary} onClick={() => guardedSetAll(1)}>
                  <Check size={15} className="text-emerald-500" /> Tất cả Đạt
                </button>
                <button className={btnSecondary} onClick={() => guardedSetAll(null)}>
                  <RotateCcw size={15} /> Bỏ chấm
                </button>
              </div>
            </div>
          )}

          {loadingItems && <LoadingRow text="Đang tải bảng kiểm..." />}

          {/* ── 5 nhóm S ── */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {groups.map((g) => {
              const done = g.items.filter(
                (it) => ketQua[it.id] !== undefined && ketQua[it.id] !== null,
              ).length;
              const pass = g.items.filter((it) => ketQua[it.id] === 1).length;
              return (
                <div
                  key={g.s_id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ backgroundColor: g.s_lt }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: g.s_color }}
                      >
                        {g.s_id}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: g.s_color }}
                      >
                        {g.s_name}
                      </span>
                    </div>
                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {pass}/{g.items.length} đạt · {done}/{g.items.length} đã chấm
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                    {g.items.map((it) => {
                      const kq = ketQua[it.id];
                      return (
                        <li
                          key={it.id}
                          className="flex items-start gap-3 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-[11px] font-semibold uppercase tracking-wide"
                              style={{ color: g.s_color }}
                            >
                              {it.sub}
                            </p>
                            <p className="mt-0.5 text-sm leading-snug text-gray-700 dark:text-gray-300">
                              {it.tc}
                            </p>
                            {kq === 0 && (
                              <input
                                className="mt-2 h-8 w-full rounded-lg border border-red-200 bg-red-50/50 px-2.5 text-xs text-gray-700 outline-none placeholder:text-red-300 focus:border-red-400 dark:border-red-500/30 dark:bg-red-500/5 dark:text-gray-200"
                                placeholder="Ghi chú lỗi (dùng cho khắc phục)..."
                                value={ghiChu[it.id] || ""}
                                onChange={(e) =>
                                  setGhiChu((p) => ({
                                    ...p,
                                    [it.id]: e.target.value,
                                  }))
                                }
                              />
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1.5 pt-0.5">
                            <button
                              onClick={() =>
                                guardedSetKetQua(it.id, kq === 1 ? null : 1)
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                kq === 1
                                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                  : "border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-400 dark:border-gray-700"
                              }`}
                              title="Đạt"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() =>
                                guardedSetKetQua(it.id, kq === 0 ? null : 0)
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                kq === 0
                                  ? "border-red-500 bg-red-500 text-white shadow-sm"
                                  : "border-gray-200 text-gray-300 hover:border-red-300 hover:text-red-400 dark:border-gray-700"
                              }`}
                              title="Không đạt"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* ── Kết quả + lưu ── */}
          {items.length > 0 && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div>
                    <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">
                      {stats.pct}%
                    </p>
                    <p className="text-xs text-gray-400">
                      {stats.dat}/{stats.tong} tiêu chí đạt · đã chấm{" "}
                      {stats.danhGiaXong}/{stats.tong}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${toneBadgeClass[xl.tone]}`}
                  >
                    {xl.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className={btnSecondary}>
                    <Camera size={15} />
                    Ảnh minh chứng
                    {existingPhotos.length + photos.length > 0 &&
                      ` (${existingPhotos.length + photos.length})`}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {viewMode === "edit" && (
                    <button
                      className={btnSecondary}
                      onClick={() => setViewMode("result")}
                    >
                      Huỷ sửa
                    </button>
                  )}
                  <button
                    className={btnPrimary}
                    disabled={!readyToSave || saving}
                    onClick={handleSave}
                  >
                    <Save size={15} />{" "}
                    {saving
                      ? "Đang lưu..."
                      : viewMode === "edit"
                        ? "Cập nhật"
                        : "Lưu kết quả"}
                  </button>
                </div>
              </div>

              {/* ── Thumbnail ảnh minh chứng (đã lưu + vừa chọn) ── */}
              {(existingPhotos.length > 0 || photos.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {existingPhotos.map((p) => (
                    <div
                      key={`existing-${p.id}`}
                      className="group relative h-16 w-16 shrink-0"
                    >
                      <div className="h-full w-full overflow-hidden rounded-lg border-2 border-[#185FA5]/30 shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[#185FA5] group-hover:shadow-lg group-hover:shadow-[#185FA5]/25">
                        <img
                          src={p.url_anh}
                          alt={p.ten_file || "Ảnh minh chứng"}
                          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-110"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(p.id)}
                        disabled={deletingPhotoId === p.id}
                        title="Xoá ảnh"
                        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition-all duration-150 hover:scale-110 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-gray-900"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                  {photos.map((f, i) => (
                    <div key={`new-${i}`} className="group relative h-16 w-16 shrink-0">
                      <div className="h-full w-full overflow-hidden rounded-lg border-2 border-[#185FA5]/30 shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[#185FA5] group-hover:shadow-lg group-hover:shadow-[#185FA5]/25">
                        <img
                          src={photoPreviews[i]}
                          alt={f.name}
                          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-110"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQueuedPhoto(i)}
                        title="Bỏ ảnh này"
                        className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white transition-all duration-150 hover:scale-110 hover:bg-red-600 dark:ring-gray-900"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* progress bar */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all ${stats.pct >= 90 ? "bg-emerald-500" : stats.pct >= 75 ? "bg-sky-500" : stats.pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${stats.pct}%` }}
                />
              </div>

              {photoStatus && (
                <p className="mt-2 text-xs text-gray-400">{photoStatus}</p>
              )}
              {!readyToSave && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  {lichCheck.ok
                    ? `⚠ Cần chọn khoa, vị trí và chấm đủ ${stats.tong} tiêu chí trước khi lưu.`
                    : "⚠ Điều kiện đang chọn chưa khớp Lịch đánh giá — xem cảnh báo phía trên."}
                </p>
              )}
              {saveError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  ✗ {saveError}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modal cảm ơn sau khi lưu mới — tự tắt sau 3s hoặc bấm x ── */}
      <Modal
        open={showSuccessModal}
        title="Đã lưu kết quả"
        onClose={() => setShowSuccessModal(false)}
      >
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
            <PartyPopper size={28} />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
              Cảm ơn bạn đã hoàn thành đánh giá 5S!
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kết quả đã được ghi nhận vào hệ thống
              {saved ? (
                <>
                  {" "}
                  với tỷ lệ đạt{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    {saved.pct}%
                  </span>{" "}
                  ({saved.xep_loai}). Bạn chỉ có thể sửa hoặc xoá đánh giá này
                  trong ngày hôm nay. Rất cảm ơn sự tận tâm của bạn trong công
                  tác giữ gìn 5S tại đơn vị!
                </>
              ) : (
                "."
              )}
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Modal báo lỗi khi điều kiện chưa khớp Lịch đánh giá ── */}
      <Modal
        open={lichModalOpen}
        title="Chưa thể chấm điểm"
        onClose={() => setLichModalOpen(false)}
        footer={
          <button className={btnPrimary} onClick={() => setLichModalOpen(false)}>
            Đã hiểu
          </button>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
            <AlertTriangle size={20} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {lichCheck.message}
          </p>
        </div>
      </Modal>

      {/* ── Modal xác nhận xoá ── */}
      <Modal
        open={confirmDeleteOpen}
        title="Xoá đánh giá"
        onClose={() => setConfirmDeleteOpen(false)}
        footer={
          <>
            <button
              className={btnSecondary}
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Huỷ
            </button>
            <button
              className={btnDanger}
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 size={14} /> {deleting ? "Đang xoá..." : "Xoá đánh giá"}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Bạn chắc chắn muốn xoá đánh giá này (
          {foundRecord?.pct}% — {foundRecord?.xep_loai})? Hành động này không
          thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
}
