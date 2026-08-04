import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
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
import {
  fetchLichPhanCongList,
  createUpdateLichPhanCong,
  fetchDanhGiaList,
  fetchDotDanhGiaList,
} from "../features/qlcl/api";
import type { LichPhanCong, DanhGia, DotDanhGia } from "../features/qlcl/types";
import { useKhoaViTri } from "../features/qlcl/useKhoaViTri";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useHasPermission } from "../features/auth/usePermission";
import { useToast } from "../features/ui/useToast";
import { PERMISSION } from "../features/auth/permissions";
import { invalidateTodayLich } from "../features/qlcl/todayLichSlice";
import { isLichDone, isLichSelfReview, groupLich } from "../features/qlcl/lichUtils";
import type { LichGroup } from "../features/qlcl/lichUtils";

const THU_LABEL = [
  "",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "CN",
];

// Vị trí tổng hợp (bộ tiêu chí dùng chung) — ưu tiên chọn mặc định khi tạo
// lịch mới, xem trang Cấu hình > Tiêu chí.
const TAT_CA_VI_TRI_LABEL = "Tất cả vị trí";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=CN
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
// Dùng ngày/tháng/năm THEO GIỜ ĐỊA PHƯƠNG — không dùng toISOString() vì nó quy
// đổi sang UTC, dễ lệch 1 ngày so với lịch thực tế (VN là UTC+7).
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const fmtVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
// "YYYY-MM-DD" (từ backend) -> "DD/MM" để hiển thị, tránh lồng template literal
function fmtVNFromDateStr(s: string): string {
  return fmtVN(new Date(`${s}T00:00:00`));
}

// "Loại lịch" (dinh_ky/mot_lan/dot_xuat) giờ suy ra từ TÊN đợt đánh giá đã chọn
// (bảng cấu hình Đợt đánh giá đã có sẵn các đợt tên đúng "Định kỳ"/"Một lần"/
// "Đột xuất") thay vì cho chọn tay 3 option cố định như trước. Đợt nào không
// khớp tên nào ở trên (VD: "Đợt 1 - Quý 3/2026") thì mặc định coi là "mot_lan"
// (1 ngày cụ thể trong đợt, không lặp lại hàng tuần).
function inferLoaiLichFromTenDot(tenDot: string | undefined): string {
  const t = (tenDot || "").trim().toLowerCase();
  if (t === "định kỳ") return "dinh_ky";
  if (t === "đột xuất") return "dot_xuat";
  return "mot_lan";
}

// groupLich/LichGroup dùng chung từ lichUtils.ts (đã tự nhóm riêng theo LUỒNG
// tự đánh giá/QLCL đánh giá, xem isLichSelfReview + ghi chú ở lichUtils.ts).

function tenNguoi(l: LichPhanCong) {
  return l.nguoi_thuc_hien?.email || l.nguoi_thuc_hien?.username || "";
}

// Mốc ngày bắt đầu áp dụng thực tế của 1 lịch định kỳ: ưu tiên ngay_thuc_hien
// (ngày bắt đầu do người dùng chọn); nếu chưa có (lịch cũ tạo trước khi có
// trường này) thì dùng NGÀY TẠO bản ghi làm mốc — tránh lặp NGƯỢC về các tuần
// trước khi lịch thực sự tồn tại (VD: lịch tạo 09/07 lại hiện cả tháng 5, 6).
function effectiveStartDate(l: LichPhanCong): string | null {
  if (l.ngay_thuc_hien) return l.ngay_thuc_hien;
  return l.createdAt ? fmt(new Date(l.createdAt)) : null;
}

// Trải lịch (định kỳ theo thứ / một lần / đột xuất) ra danh sách {lich, date}
// cụ thể trong khoảng [fromStr, toStr] — dùng cho khối "Trưởng phòng theo dõi
// tuân thủ lịch" (cần liệt kê hết các buổi lịch phát sinh trong 1 khoảng ngày,
// khác với lichForDay() chỉ tính cho đúng 1 ngày).
function expandLichRange(
  items: LichPhanCong[],
  fromStr: string,
  toStr: string,
): Array<{ lich: LichPhanCong; date: string }> {
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  const out: Array<{ lich: LichPhanCong; date: string }> = [];
  for (const l of items) {
    if (l.loai_lich === "dinh_ky") {
      const startBound = effectiveStartDate(l);
      let d = new Date(from);
      while (d <= to) {
        const thu = d.getDay() === 0 ? 7 : d.getDay();
        const dStr = fmt(d);
        if (thu === l.thu_trong_tuan && (!startBound || dStr >= startBound)) {
          out.push({ lich: l, date: dStr });
        }
        d = addDays(d, 1);
      }
    } else if (
      l.ngay_thuc_hien &&
      l.ngay_thuc_hien >= fromStr &&
      l.ngay_thuc_hien <= toStr
    ) {
      out.push({ lich: l, date: l.ngay_thuc_hien });
    }
  }
  return out;
}

// Nhóm các dòng đã trải theo ngày (từ expandLichRange) lại thành 1 dòng/buổi
// lịch — cùng khoa + vị trí + loại + ngày cụ thể thì nhiều cán bộ phụ trách
// gộp chung 1 dòng (khớp cách hiển thị của bảng mẫu), thay vì 1 dòng/người.
interface TTGroup {
  key: string;
  lich: LichPhanCong;
  date: string;
  items: LichPhanCong[];
}
function groupTTExpanded(
  expanded: Array<{ lich: LichPhanCong; date: string }>,
): TTGroup[] {
  const map = new Map<string, TTGroup>();
  for (const { lich: l, date } of expanded) {
    // Nhóm riêng theo LUỒNG (tự đánh giá / QLCL đánh giá) -- xem ghi chú ở
    // groupLich (lichUtils.ts): 2 lịch của 2 luồng khác nhau trùng
    // khoa/vị trí/loại/ngày KHÔNG được gộp chung 1 dòng, kẻo lẫn tên người +
    // trạng thái hoàn thành của luồng này sang luồng kia.
    const key = [
      l.khoa_id,
      l.vitri_type_id ?? "x",
      l.loai_lich,
      date,
      isLichSelfReview(l) ? "tu-danh-gia" : "qlcl-danh-gia",
    ].join("|");
    let g = map.get(key);
    if (!g) {
      g = { key, lich: l, date, items: [] };
      map.set(key, g);
    }
    g.items.push(l);
  }
  return Array.from(map.values());
}

// Bỏ dấu tiếng Việt để gõ tên không dấu vẫn lọc được (VD: "phuong" khớp "Phương")
function boDauVN(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export default function LichDanhGia() {
  const { khoaList, users, vitriTypes } = useCatalog();
  const currentUser = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const toast = useToast();
  // Được thêm mới / sửa / xoá lịch (chỉ Admin, Trưởng khoa) — Phòng QLCL/Nhân viên chỉ xem
  const canManage = useHasPermission(PERMISSION.PHAN_CONG_DANH_GIA);
  // Admin thấy toàn bộ cán bộ; các role khác chỉ thấy cán bộ cùng khoa/phòng của mình
  const isAdmin = useHasPermission(PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH);
  // Phòng QLCL (loại trừ Admin -- Admin cũng giữ XEM_TONG_HOP_TAT_CA_KHOA theo
  // sơ đồ "Admin = hợp mọi quyền", xem seedRolePermission.js).
  const isRealAdmin = useHasPermission(PERMISSION.TAO_TAI_KHOAN);
  const isQlcl =
    useHasPermission(PERMISSION.XEM_TONG_HOP_TAT_CA_KHOA) && !isRealAdmin;
  // Admin và Phòng QLCL được dùng ô select "Khoa/Phòng cán bộ" để xem lịch của
  // TỪNG khoa cụ thể (mặc định chỉ thấy lịch do cán bộ Phòng QLCL phụ trách).
  const canBrowseKhoaCanBo = isAdmin || isQlcl;

  const [lichList, setLichList] = useState<LichPhanCong[]>([]);
  const [danhGiaList, setDanhGiaList] = useState<DanhGia[]>([]);
  const [dotDanhGiaList, setDotDanhGiaList] = useState<DotDanhGia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [filterNguoi, setFilterNguoi] = useState("");
  // Admin-only: lọc TOÀN BỘ trang (lịch tuần + bảng "Trưởng phòng theo dõi tuân
  // thủ lịch") theo KHOA/PHÒNG CỦA CÁN BỘ PHỤ TRÁCH (không phải khoa được đánh
  // giá) — VD chọn "Phòng Tài chính kế toán" thì chỉ hiện lịch mà người phụ
  // trách là nhân viên phòng TCKT, chọn "Phòng QLCL" thì chỉ hiện lịch do nhân
  // viên QLCL phụ trách.
  const [filterKhoaCanBo, setFilterKhoaCanBo] = useState<number | "">("");

  // ── Trưởng phòng theo dõi tuân thủ lịch ──
  const [ttRange, setTtRange] = useState<"week" | "all">("week");
  const [ttNguoi, setTtNguoi] = useState("");

  // Modal xác nhận xoá lịch (thay cho window.confirm — có thể bị trình duyệt
  // chặn/ẩn ở 1 số môi trường, và không đồng bộ giao diện với phần còn lại của app)
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<LichGroup | null>(null);
  // Mỗi ngày trong lưới tuần chỉ hiện tối đa 10 buổi lịch -- bấm "Xem thêm" mở
  // modal liệt kê ĐẦY ĐỦ lịch của đúng ngày đó (tránh 1 ngày quá tải hiển thị).
  const DAY_VISIBLE_LIMIT = 10;
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Modal thêm lịch
  const [modalOpen, setModalOpen] = useState(false);
  // "Loại lịch" giờ chọn từ danh sách Đợt đánh giá (API) thay vì 3 option cố
  // định — mDotDanhGiaId lưu id đợt đã chọn, mType (dinh_ky/mot_lan/dot_xuat)
  // được suy ra tự động từ TÊN đợt đó (xem inferLoaiLichFromTenDot).
  const [mDotDanhGiaId, setMDotDanhGiaId] = useState<number | "">("");
  // Đang sửa buổi lịch nào (null = đang tạo mới) — dùng để đối chiếu danh sách
  // người cũ/mới khi lưu, và để saveLich() biết cập nhật thay vì tạo mới.
  const [mEditGroup, setMEditGroup] = useState<LichGroup | null>(null);
  // dotDanhGiaList chỉ tải các đợt "đang mở" (để KHÔNG cho gán lịch mới vào đợt đã
  // đóng) — nhưng khi SỬA 1 buổi lịch cũ thuộc đợt đã đóng, đợt đó sẽ không có
  // trong danh sách, khiến dropdown trống và chặn luôn việc lưu (dù chỉ sửa ghi
  // chú/người). Bù thêm chính đợt đang gán (lấy từ quan hệ `dot` có sẵn trên
  // item) vào đầu danh sách hiển thị trong modal nếu nó bị thiếu.
  const modalDotOptions = useMemo(() => {
    if (!mEditGroup) return dotDanhGiaList;
    const first = mEditGroup.items[0];
    const dotId = first.dot_danh_gia_id;
    if (dotId == null || dotDanhGiaList.some((d) => d.id === dotId))
      return dotDanhGiaList;
    if (!first.dot) return dotDanhGiaList;
    return [
      {
        id: first.dot.id,
        ten_dot: `${first.dot.ten_dot} (đã đóng)`,
        tu_ngay: null,
        den_ngay: null,
        mo_ta: null,
        trang_thai: first.dot.trang_thai || "da-dong",
        active: 1,
      },
      ...dotDanhGiaList,
    ];
  }, [mEditGroup, dotDanhGiaList]);
  const selectedDot = useMemo(
    () => modalDotOptions.find((d) => d.id === mDotDanhGiaId),
    [modalDotOptions, mDotDanhGiaId],
  );
  const mType = useMemo(
    () => inferLoaiLichFromTenDot(selectedDot?.ten_dot),
    [selectedDot],
  );
  const [mNgay, setMNgay] = useState(fmt(new Date()));

  // Ngày chọn phải nằm trong khoảng [tu_ngay, den_ngay] của đợt đánh giá đã chọn —
  // đổi đợt mà ngày đang chọn lệch khỏi khoảng mới thì tự kéo về biên gần nhất.
  useEffect(() => {
    if (!selectedDot) return;
    if (selectedDot.tu_ngay && mNgay < selectedDot.tu_ngay) {
      setMNgay(selectedDot.tu_ngay);
    } else if (selectedDot.den_ngay && mNgay > selectedDot.den_ngay) {
      setMNgay(selectedDot.den_ngay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDot]);
  // "Thứ trong tuần" của lịch định kỳ được TÍNH TỰ ĐỘNG từ ngày đã chọn (mNgay),
  // không cho chọn tay nữa — tránh lệch giữa ngày bắt đầu và thứ đã chọn.
  const mThu = useMemo(() => {
    const d = new Date(`${mNgay}T00:00:00`);
    const day = d.getDay();
    return day === 0 ? 7 : day;
  }, [mNgay]);
  const [mKhoa, setMKhoa] = useState<number | "">("");
  const [mVitri, setMVitri] = useState<number | "">("");
  // Vị trí hiển thị theo cấu hình khoa (trang Cấu hình > mục 1)
  const { types: mConfigTypes } = useKhoaViTri(mKhoa);
  const [mNguoi, setMNguoi] = useState<number[]>([]);
  const [mNguoiSearch, setMNguoiSearch] = useState("");
  const [mGhiChu, setMGhiChu] = useState("");
  const [savingLich, setSavingLich] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Khoa "Phòng Quản lý chất lượng" — tra theo TÊN trong danh mục khoa (không
  // hardcode id vì có thể khác nhau giữa các môi trường dữ liệu). Dùng để Admin
  // luôn thấy được cán bộ QLCL trong danh sách "Người phụ trách" (QLCL đi đánh
  // giá mọi khoa khác) song song với cán bộ của khoa đang chọn.
  const khoaQlclId = useMemo(
    () => khoaList.find((k) => boDauVN(k.ten_khoa).includes("quan ly chat luong"))?.id,
    [khoaList],
  );

  // Admin/Lãnh đạo/Phòng QLCL mặc định CHỈ xem lịch do cán bộ Phòng QLCL phụ
  // trách (không trộn lẫn nhân viên khoa khác) — chỉ khoá mặc định 1 LẦN khi
  // vừa tải xong danh mục khoa, không ép lại nếu người dùng đã tự chọn (kể cả
  // khi họ chủ động chọn lại "Tất cả" hoặc 1 khoa khác qua ô select
  // "Khoa/Phòng cán bộ").
  const didLockKhoaCanBoRef = useRef(false);
  useEffect(() => {
    if (didLockKhoaCanBoRef.current) return;
    if (!canBrowseKhoaCanBo) return;
    if (khoaQlclId == null) return;
    setFilterKhoaCanBo(khoaQlclId);
    didLockKhoaCanBoRef.current = true;
  }, [canBrowseKhoaCanBo, khoaQlclId]);

  // Tra khoa_id của 1 user theo id — dùng để lọc lịch theo "khoa của cán bộ phụ
  // trách" (khác với l.khoa_id vốn là khoa ĐƯỢC đánh giá).
  const userKhoaMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.khoa_id ?? null])),
    [users],
  );

  // Trưởng khoa/Nhân viên (không được browse khoa khác) bị KHOÁ CỨNG bộ lọc
  // "khoa của cán bộ phụ trách" về đúng khoa/phòng của chính họ -- không còn
  // thấy lịch/cán bộ Phòng QLCL nữa (kể cả khi QLCL đến đánh giá khoa họ).
  // Admin/Lãnh đạo/Phòng QLCL vẫn dùng filterKhoaCanBo do họ tự chọn qua select.
  const effectiveFilterKhoaCanBo = canBrowseKhoaCanBo
    ? filterKhoaCanBo
    : (currentUser?.khoa_id ?? "");

  // Danh sách cán bộ hiện trong 2 select "— Tất cả cán bộ —" (lịch tuần + bảng
  // theo dõi tuân thủ) -- đúng theo comment ở isAdmin phía trên: Admin thấy toàn
  // bộ (thu hẹp lại theo "Khoa/Phòng cán bộ" nếu đang lọc), các role khác CHỈ
  // thấy cán bộ cùng khoa/phòng của mình, không phải toàn bộ user hệ thống.
  const canBoOptions = useMemo(() => {
    if (effectiveFilterKhoaCanBo === "") return users;
    return users.filter((u) => u.khoa_id === Number(effectiveFilterKhoaCanBo));
  }, [users, effectiveFilterKhoaCanBo]);

  // Danh sách "Người phụ trách" được phép tích chọn:
  // - Trưởng khoa/phòng (không phải Admin): LUÔN LÀ CÁN BỘ CỦA CHÍNH PHÒNG/KHOA
  //   NGƯỜI ĐANG TẠO LỊCH (người phân công), KHÔNG PHẢI của khoa được chọn để
  //   đánh giá. VD: Trưởng khoa Phòng QLCL chọn "Phòng Tài chính kế toán" làm
  //   khoa được đánh giá → người phụ trách vẫn phải là cán bộ của chính Phòng
  //   QLCL (người đi đánh giá), không phải cán bộ TCKT.
  // - Admin: thấy cán bộ của KHOA ĐANG CHỌN (khoa được đánh giá) + cán bộ Phòng
  //   QLCL (vì QLCL đi đánh giá mọi khoa khác) — VD chọn "Phòng Tài chính kế
  //   toán" → hiện tài khoản TCKT + tài khoản QLCL để Admin chọn.
  // Cả 2 trường hợp đều GIỮ hiển thị người đã đang được chọn (mNguoi) dù không
  // còn khớp bộ lọc — tránh "biến mất" khi sửa 1 buổi lịch cũ (dữ liệu lịch sử).
  // 1) Chưa chọn Khoa/Phòng đánh giá → chưa hiện cán bộ nào.
  // 2) Gõ tên/tên đăng nhập để lọc nhanh.
  const nguoiOptions = useMemo(() => {
    if (mKhoa === "") return [];
    let pool = isAdmin
      ? users.filter(
          (u) =>
            u.khoa_id === Number(mKhoa) ||
            (khoaQlclId != null && u.khoa_id === khoaQlclId) ||
            mNguoi.includes(u.id),
        )
      : users.filter(
          (u) => u.khoa_id === currentUser?.khoa_id || mNguoi.includes(u.id),
        );
    if (mNguoiSearch.trim()) {
      const q = boDauVN(mNguoiSearch);
      pool = pool.filter((u) =>
        boDauVN(`${u.email || ""} ${u.username}`).includes(q),
      );
    }
    return pool;
  }, [
    users,
    isAdmin,
    khoaQlclId,
    currentUser?.khoa_id,
    mKhoa,
    mNguoiSearch,
    mNguoi,
  ]);

  // Chỉ tải lịch trong khoảng ngày THỰC SỰ cần dùng trên trang, thay vì toàn bộ
  // bảng lich_phan_cong -- tránh tải nặng khi hệ thống có nhiều người dùng cùng
  // lúc. Khoảng cần tải = HỢP của (tuần lưới đang xem) và (khoảng "Trưởng phòng
  // theo dõi tuân thủ lịch" đang chọn: tuần thực tế hoặc 60 ngày gần đây).
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const weekEndRaw = addDays(weekStart, 6);
    const mon = startOfWeek(now);
    const ttFrom = ttRange === "week" ? mon : addDays(now, -60);
    const ttTo = ttRange === "week" ? addDays(mon, 6) : now;
    const rangeFrom = weekStart.getTime() <= ttFrom.getTime() ? weekStart : ttFrom;
    const rangeTo = weekEndRaw.getTime() >= ttTo.getTime() ? weekEndRaw : ttTo;
    Promise.all([
      fetchLichPhanCongList({ tu_ngay: fmt(rangeFrom), den_ngay: fmt(rangeTo) }),
      fetchDanhGiaList().catch(() => ({ rows: [] as DanhGia[], total: 0 })),
      // Chỉ lấy đợt "đang mở" để chọn khi tạo lịch mới (giống luồng chọn đợt ở Bảng kiểm)
      fetchDotDanhGiaList({ trang_thai: "dang-mo" }).catch(() => ({
        rows: [] as DotDanhGia[],
        total: 0,
      })),
    ])
      .then(([lich, dg, dot]) => {
        setLichList(lich.rows.filter((l) => l.active !== 0));
        setDanhGiaList(dg.rows.filter((d) => d.active !== 0));
        setDotDanhGiaList(dot.rows);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được lịch"),
      )
      .finally(() => setLoading(false));
  }, [weekStart, ttRange]);

  useEffect(load, [load]);

  const weekDays = useMemo(
    () =>
      Array.from(
        { length: 6 },
        (_, i) => new Date(weekStart.getTime() + i * 86400000),
      ),
    [weekStart],
  );
  const weekEnd = useMemo(
    () => new Date(weekStart.getTime() + 6 * 86400000),
    [weekStart],
  ); // CN — chỉ dùng cho nhãn tuần

  // Lịch áp dụng cho 1 ngày: định kỳ theo thứ, hoặc một lần/đột xuất đúng ngày
  const lichForDay = useCallback(
    (d: Date) => {
      const thu = d.getDay() === 0 ? 7 : d.getDay(); // 1..7
      const dStr = fmt(d);
      return lichList.filter((l) => {
        if (filterNguoi && String(l.nguoi_thuc_hien_id) !== filterNguoi)
          return false;
        if (
          effectiveFilterKhoaCanBo !== "" &&
          userKhoaMap.get(l.nguoi_thuc_hien_id) !== Number(effectiveFilterKhoaCanBo)
        )
          return false;
        if (l.loai_lich === "dinh_ky") {
          if (l.thu_trong_tuan !== thu) return false;
          // Lịch định kỳ chỉ lặp lại KỂ TỪ ngày bắt đầu áp dụng trở đi (xem
          // effectiveStartDate) — không hiển thị ngược lại các tuần trước đó.
          const startBound = effectiveStartDate(l);
          if (startBound && dStr < startBound) return false;
          return true;
        }
        return l.ngay_thuc_hien === dStr;
      });
    },
    [lichList, filterNguoi, effectiveFilterKhoaCanBo, userKhoaMap],
  );

  // Đã có kết quả đánh giá (bảng kiểm) khớp khoa + vị trí + ngày + ĐÚNG cán bộ
  // được phân công trong lịch → coi là đã hoàn thành (xem isLichDone ở
  // lichUtils.ts -- dùng chung để 2 luồng lịch khác nhau, dù trùng khoa/vị
  // trí/ngày, KHÔNG bị tính nhầm hoàn thành lẫn của nhau).
  const isDone = useCallback(
    (l: LichPhanCong, dateStr: string) => isLichDone(danhGiaList, l, dateStr),
    [danhGiaList],
  );

  const today = new Date();
  const todayStr = fmt(today);
  // "Phân công hôm nay" là góc nhìn CÁ NHÂN — luôn chỉ hiện lịch mà người phụ
  // trách thuộc ĐÚNG khoa/phòng của tài khoản đang đăng nhập (không phụ thuộc bộ
  // lọc "Khoa/Phòng cán bộ" ở lịch tuần, vốn dùng để Admin/QLCL khảo sát khoa
  // khác). VD tài khoản Phòng QLCL sẽ chỉ thấy ở đây lịch hôm nay do CHÍNH nhân
  // viên QLCL phụ trách, không lẫn lịch của các khoa khác dù họ xem được toàn bộ.
  const todayLich = useMemo(() => {
    if (currentUser?.khoa_id == null) return [];
    const thu = today.getDay() === 0 ? 7 : today.getDay();
    return lichList.filter((l) => {
      if (userKhoaMap.get(l.nguoi_thuc_hien_id) !== currentUser.khoa_id)
        return false;
      if (l.loai_lich === "dinh_ky") {
        if (l.thu_trong_tuan !== thu) return false;
        const startBound = effectiveStartDate(l);
        if (startBound && todayStr < startBound) return false;
        return true;
      }
      return l.ngay_thuc_hien === todayStr;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lichList, userKhoaMap, currentUser?.khoa_id, todayStr]);

  const kpi = useMemo(() => {
    let total = 0;
    let done = 0;
    let miss = 0;
    let upcoming = 0;
    weekDays.forEach((d) => {
      const dStr = fmt(d);
      groupLich(lichForDay(d)).forEach((g) => {
        total++;
        // Nhóm có thể gồm nhiều người CÙNG luồng -- "hoàn thành" nếu BẤT KỲ
        // người nào trong nhóm đã nộp đánh giá, không chỉ kiểm tra người đầu
        // tiên (items[0]) như trước.
        if (g.items.some((l) => isDone(l, dStr))) done++;
        else if (dStr <= todayStr) miss++;
        else upcoming++;
      });
    });
    return { total, done, miss, upcoming };
  }, [weekDays, lichForDay, isDone, todayStr]);

  // Khoảng thời gian theo dõi tuân thủ: "week" = tuần hiện tại (Thứ 2 → CN),
  // "all" = 60 ngày gần đây tới hôm nay (không phụ thuộc tuần đang xem ở lịch grid)
  const ttExpanded = useMemo(() => {
    const mon = startOfWeek(today);
    const from = ttRange === "week" ? fmt(mon) : fmt(addDays(today, -60));
    const to = ttRange === "week" ? fmt(addDays(mon, 6)) : todayStr;
    let items = lichList;
    if (ttNguoi)
      items = items.filter((l) => String(l.nguoi_thuc_hien_id) === ttNguoi);
    if (effectiveFilterKhoaCanBo !== "")
      items = items.filter(
        (l) => userKhoaMap.get(l.nguoi_thuc_hien_id) === Number(effectiveFilterKhoaCanBo),
      );
    return expandLichRange(items, from, to);
  }, [lichList, ttRange, ttNguoi, todayStr, effectiveFilterKhoaCanBo, userKhoaMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Gộp nhiều cán bộ phụ trách của cùng 1 buổi lịch/ngày vào 1 nhóm — KPI và
  // bảng chi tiết đếm theo BUỔI LỊCH (không theo số người), tránh đếm trùng khi
  // 1 buổi có nhiều người phụ trách (quy ước backend 1 dòng = 1 người).
  const ttGroups = useMemo(() => groupTTExpanded(ttExpanded), [ttExpanded]);

  const ttKpi = useMemo(() => {
    const total = ttGroups.length;
    const done = ttGroups.filter((g) =>
      g.items.some((l) => isDone(l, g.date)),
    ).length;
    const miss = ttGroups.filter(
      (g) => !g.items.some((l) => isDone(l, g.date)) && g.date <= todayStr,
    ).length;
    return { total, done, miss, upcoming: total - done - miss };
  }, [ttGroups, isDone, todayStr]);

  // Tóm tắt tỷ lệ tuân thủ theo từng cán bộ (chỉ hiển thị khi không lọc riêng 1 người)
  const ttSummary = useMemo(() => {
    const map = new Map<
      string,
      { total: number; done: number; miss: number }
    >();
    ttExpanded.forEach(({ lich: l, date }) => {
      const name = tenNguoi(l) || "(chưa rõ)";
      const done = isDone(l, date);
      const isPast = date <= todayStr;
      const cur = map.get(name) || { total: 0, done: 0, miss: 0 };
      cur.total++;
      if (done) cur.done++;
      else if (isPast) cur.miss++;
      map.set(name, cur);
    });
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        ...v,
        pct: v.total ? Math.round((v.done / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [ttExpanded, isDone, todayStr]);

  const ttDetail = useMemo(
    () => [...ttGroups].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [ttGroups],
  );

  function openModal() {
    setMEditGroup(null);
    setMDotDanhGiaId(dotDanhGiaList[0]?.id ?? "");
    setMNgay(fmt(new Date()));
    // Trưởng khoa/phòng (không phải Admin) chỉ được lập lịch cho ĐÚNG khoa/
    // phòng của mình — khoá sẵn, không cho đổi (backend cũng chặn nếu cố gửi
    // khoa khác). Admin mới được tự do chọn khoa cần lập lịch.
    setMKhoa(!isAdmin && currentUser?.khoa_id != null ? currentUser.khoa_id : "");
    // Mặc định vị trí "Tất cả vị trí" (bộ tiêu chí tổng hợp) khi tạo lịch mới —
    // vẫn chọn được vị trí khác bất kỳ lúc nào qua select bên dưới.
    const tatCa = vitriTypes.find((v) => v.ten_vitri === TAT_CA_VI_TRI_LABEL);
    setMVitri(tatCa?.id ?? "");
    setMNguoi([]);
    setMNguoiSearch("");
    setMGhiChu("");
    setModalError(null);
    setModalOpen(true);
  }

  // Mở form sửa 1 buổi lịch (nhóm) — điền lại toàn bộ dữ liệu đang có, kể cả
  // danh sách người phụ trách hiện tại của buổi đó.
  function openEditModal(g: LichGroup) {
    const first = g.items[0];
    setMEditGroup(g);
    setMDotDanhGiaId(first.dot_danh_gia_id ?? "");
    setMNgay(first.ngay_thuc_hien ?? fmt(new Date()));
    setMKhoa(first.khoa_id);
    setMVitri(first.vitri_type_id ?? "");
    setMNguoi(g.items.map((it) => it.nguoi_thuc_hien_id));
    setMNguoiSearch("");
    setMGhiChu(g.ghiChu || "");
    setModalError(null);
    setModalOpen(true);
  }

  async function saveLich() {
    if (mDotDanhGiaId === "" || mKhoa === "" || mNguoi.length === 0) {
      setModalError("Cần chọn đợt đánh giá, khoa và ít nhất 1 người phụ trách");
      return;
    }
    // Ngày chọn phải nằm trong khoảng ngày của đợt đánh giá đã chọn
    if (selectedDot?.tu_ngay && mNgay < selectedDot.tu_ngay) {
      setModalError(
        `Ngày phải từ ${fmtVNFromDateStr(selectedDot.tu_ngay)} trở đi (theo đợt "${selectedDot.ten_dot}")`,
      );
      return;
    }
    if (selectedDot?.den_ngay && mNgay > selectedDot.den_ngay) {
      setModalError(
        `Ngày phải trước ${fmtVNFromDateStr(selectedDot.den_ngay)} (theo đợt "${selectedDot.ten_dot}")`,
      );
      return;
    }
    setSavingLich(true);
    setModalError(null);
    try {
      const payloadBase = {
        khoa_id: Number(mKhoa),
        vitri_type_id: mVitri === "" ? null : Number(mVitri),
        dot_danh_gia_id: Number(mDotDanhGiaId),
        // loai_lich (dinh_ky/mot_lan/dot_xuat) suy ra tự động từ tên đợt đã chọn
        loai_lich: mType,
        thu_trong_tuan: mType === "dinh_ky" ? mThu : null,
        // Luôn gửi ngày đã chọn — với "dinh_ky" đây là NGÀY BẮT ĐẦU áp dụng
        // (lịch sẽ lặp lại vào đúng thứ này mỗi tuần, kể từ ngày này trở đi).
        ngay_thuc_hien: mNgay,
        ghi_chu: mGhiChu || null,
      };
      if (mEditGroup) {
        // Sửa: đối chiếu người đang chọn với người cũ trong nhóm — người còn
        // giữ thì cập nhật đúng dòng cũ, người mới thêm thì tạo dòng mới, người
        // bị bỏ chọn thì xoá mềm (active=0). Quy ước backend vẫn là 1 dòng = 1 người.
        const existingByUser = new Map(
          mEditGroup.items.map((it) => [it.nguoi_thuc_hien_id, it]),
        );
        for (const nguoiId of mNguoi) {
          const existing = existingByUser.get(nguoiId);
          await createUpdateLichPhanCong({
            id: existing?.id,
            ...payloadBase,
            nguoi_thuc_hien_id: nguoiId,
          });
        }
        for (const it of mEditGroup.items) {
          if (!mNguoi.includes(it.nguoi_thuc_hien_id)) {
            await createUpdateLichPhanCong({ id: it.id, active: 0 });
          }
        }
      } else {
        // Tạo mới — quy ước backend: 1 dòng = 1 người → phân công nhiều người = nhiều dòng
        for (const nguoiId of mNguoi) {
          await createUpdateLichPhanCong({
            ...payloadBase,
            nguoi_thuc_hien_id: nguoiId,
          });
        }
      }
      setModalOpen(false);
      // Lịch vừa lưu có thể rơi vào đúng hôm nay -- đánh dấu cache "Lịch hôm
      // nay" dùng chung (banner + trang Thống kê) là cũ để tự làm mới.
      dispatch(invalidateTodayLich());
      load();
      toast.success(mEditGroup ? "Đã lưu thay đổi lịch đánh giá!" : "Đã tạo lịch đánh giá mới!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu lịch thất bại";
      setModalError(msg);
      toast.error(msg);
    } finally {
      setSavingLich(false);
    }
  }

  // Khi Admin dùng ô select "Khoa/Phòng cán bộ" để XEM lịch do cán bộ 1 khoa
  // KHÁC (không phải Phòng QLCL) phụ trách, đây chỉ là chế độ xem tham khảo —
  // ẩn nút sửa/xoá trên từng thẻ lịch (không cho thao tác từ đây), khớp yêu
  // cầu "chọn khoa dược thì hiện lịch khoa dược, không hiển thị nút sửa xoá".
  const canManageThisView =
    canManage &&
    (!canBrowseKhoaCanBo ||
      filterKhoaCanBo === "" ||
      khoaQlclId == null ||
      filterKhoaCanBo === khoaQlclId);

  // Thẻ hiển thị 1 buổi lịch — dùng chung cho lưới tuần VÀ modal "xem thêm"
  // (đủ lịch của 1 ngày) để không lặp code.
  function renderLichCard(g: LichGroup, d: Date) {
    const dStr = fmt(d);
    const done = g.items.some((l) => isDone(l, dStr));
    const isPastOrToday = dStr <= fmt(today);
    const names = g.items.map(tenNguoi).filter(Boolean).join(" · ");
    return (
      <div
        key={g.key}
        className={`rounded-lg border-l-[3px] border px-2 py-1.5 text-[11px] leading-tight shadow-sm ${
          done
            ? "border-l-emerald-500 border-emerald-100 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
            : isPastOrToday
              ? "border-l-red-500 border-red-100 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
              : "border-l-sky-500 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        }`}
      >
        <p className="font-semibold text-gray-700 dark:text-gray-200">
          {done ? "✅" : isPastOrToday ? "❌" : "⏳"} {g.khoa?.ten_khoa}
        </p>
        {g.vitri_type?.ten_vitri && (
          <p className="text-gray-400">{g.vitri_type.ten_vitri}</p>
        )}
        <p className="flex items-center gap-1 text-gray-400">
          <Users size={11} /> {names}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-1">
          <span
            className={`inline-block rounded px-1 text-[10px] font-medium ${
              g.loai_lich === "dinh_ky"
                ? "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
                : g.loai_lich === "dot_xuat"
                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            }`}
          >
            {g.loai_lich === "dinh_ky"
              ? "Định kỳ"
              : g.loai_lich === "dot_xuat"
                ? "Đột xuất"
                : "Một lần"}
          </span>
          {canManageThisView && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openEditModal(g)}
                className="text-gray-300 hover:text-brand-500"
                title="Sửa"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDeleteGroup(g);
                }}
                className="text-gray-300 hover:text-red-500"
                title="Xoá"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Xoá cả nhóm (mọi người được phân công trong cùng 1 buổi lịch) — gọi sau khi
  // xác nhận ở modal (xem confirmDeleteGroup/setConfirmDeleteGroup bên dưới).
  async function deleteLichGroup(g: LichGroup) {
    setDeletingGroup(true);
    setDeleteError(null);
    try {
      await Promise.all(
        g.items.map((it) => createUpdateLichPhanCong({ id: it.id, active: 0 })),
      );
      load();
      dispatch(invalidateTodayLich());
      setConfirmDeleteGroup(null);
      toast.success("Đã xoá lịch đánh giá!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Xoá thất bại";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeletingGroup(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<CalendarDays size={22} />}
        title="Lịch đánh giá 5S"
        subtitle="Lịch tuần định kỳ · Kiểm tra đột xuất · Theo dõi tuân thủ cán bộ"
        actions={
          canManage && (
            <button className={btnPrimary} onClick={openModal}>
              <Plus size={16} /> Thêm lịch
            </button>
          )
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="📋 Tổng lịch" value={kpi.total} accent="navy" />
        <KpiCard label="✅ Đã hoàn thành" value={kpi.done} accent="green" />
        <KpiCard label="❌ Chưa thực hiện" value={kpi.miss} accent="red" />
        <KpiCard label="⏳ Sắp tới" value={kpi.upcoming} accent="yellow" />
      </div>

      {loading ? (
        <LoadingRow />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
          {/* ── Lịch tuần ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                className={btnSecondary}
                onClick={() =>
                  setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))
                }
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tuần {fmtVN(weekDays[0])} – {fmtVN(weekEnd)}/
                {weekEnd.getFullYear()}
              </p>
              <button
                className={btnSecondary}
                onClick={() =>
                  setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))
                }
              >
                <ChevronRight size={16} />
              </button>
              <button
                className={btnSecondary}
                onClick={() => setWeekStart(startOfWeek(new Date()))}
              >
                Hôm nay
              </button>
              {canBrowseKhoaCanBo && (
                <div className="ml-auto" style={{ minWidth: 220 }}>
                  <SearchableSelect
                    value={filterKhoaCanBo}
                    onChange={setFilterKhoaCanBo}
                    options={khoaList.map((k) => ({
                      value: k.id,
                      label: k.ten_khoa,
                    }))}
                    placeholder="— Khoa/Phòng cán bộ: Tất cả —"
                  />
                </div>
              )}
              <select
                className={`${inputCls} ${canBrowseKhoaCanBo ? "" : "ml-auto"}`}
                value={filterNguoi}
                onChange={(e) => setFilterNguoi(e.target.value)}
              >
                <option value="">— Tất cả cán bộ —</option>
                {canBoOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email || u.username}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {weekDays.map((d, i) => {
                const dayLich = lichForDay(d);
                const isToday = fmt(d) === fmt(today);
                return (
                  <div
                    key={i}
                    className={`min-h-[130px] rounded-xl border p-3 ${
                      isToday
                        ? "border-brand-300 bg-brand-25 ring-1 ring-brand-200 dark:border-brand-500/40 dark:bg-brand-500/5 dark:ring-brand-500/20"
                        : "border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/40"
                    }`}
                  >
                    <p
                      className={`mb-2 text-xs font-semibold ${isToday ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"}`}
                    >
                      {THU_LABEL[i + 1]} · {fmtVN(d)} {isToday && "• Hôm nay"}
                    </p>
                    <div className="space-y-1.5">
                      {dayLich.length === 0 && (
                        <p className="text-[11px] text-gray-300 dark:text-gray-600">
                          —
                        </p>
                      )}
                      {(() => {
                        const dayGroups = groupLich(dayLich);
                        const visible = dayGroups.slice(0, DAY_VISIBLE_LIMIT);
                        const extra = dayGroups.length - visible.length;
                        return (
                          <>
                            {visible.map((g) => renderLichCard(g, d))}
                            {extra > 0 && (
                              <button
                                type="button"
                                onClick={() => setDayModalDate(d)}
                                className="w-full rounded-lg border border-dashed border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-brand-600 transition hover:bg-brand-50 dark:border-gray-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
                              >
                                Xem thêm (+{extra})
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Phân công hôm nay ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
              👤 Phân công hôm nay
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                {today.toLocaleDateString("vi-VN")}
              </span>
            </h3>
            {todayLich.length === 0 ? (
              <EmptyState message="Không có lịch hôm nay" />
            ) : (
              <ul className="space-y-2">
                {groupLich(todayLich).map((g) => {
                  const done = g.items.some((l) => isDone(l, todayStr));
                  const names = g.items
                    .map(tenNguoi)
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={g.key}
                      className={`rounded-xl border-l-4 border-y border-r p-3 ${
                        done
                          ? "border-l-emerald-500 border-y-gray-100 border-r-gray-100 bg-emerald-50/50 dark:border-y-gray-800 dark:border-r-gray-800 dark:bg-emerald-500/5"
                          : "border-l-red-500 border-y-gray-100 border-r-gray-100 bg-red-50/50 dark:border-y-gray-800 dark:border-r-gray-800 dark:bg-red-500/5"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {g.khoa?.ten_khoa}
                      </p>
                      {g.vitri_type?.ten_vitri && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} /> {g.vitri_type.ten_vitri}
                        </p>
                      )}
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Users size={11} /> {names}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          done
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                        }`}
                      >
                        {done ? "✅ Đã hoàn thành" : "⏳ Chưa đánh giá"}
                      </span>
                      {g.ghiChu && (
                        <p className="mt-1 text-[11px] italic text-gray-400">
                          “{g.ghiChu}”
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Danh sách toàn bộ lịch ── */}
      {/* {!loading && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Toàn bộ lịch phân công ({lichList.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Khoa/Phòng</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Người thực hiện</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {lichList.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-200">
                      {l.khoa?.ten_khoa}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.vitri_type?.ten_vitri || "Tất cả"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.loai_lich === "dinh_ky"
                            ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                            : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                        title={
                          l.loai_lich === "dinh_ky"
                            ? "Định kỳ"
                            : l.loai_lich === "dot_xuat"
                              ? "Đột xuất"
                              : "Một lần"
                        }
                      >
                        {l.dot?.ten_dot ||
                          (l.loai_lich === "dinh_ky"
                            ? "Định kỳ"
                            : l.loai_lich === "dot_xuat"
                              ? "Đột xuất"
                              : "Một lần")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.loai_lich === "dinh_ky"
                        ? THU_LABEL[l.thu_trong_tuan || 0] +
                          (l.ngay_thuc_hien
                            ? ` (từ ${fmtVNFromDateStr(l.ngay_thuc_hien)})`
                            : "")
                        : l.ngay_thuc_hien}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.nguoi_thuc_hien?.email ||
                        l.nguoi_thuc_hien?.username ||
                        "—"}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-400">
                      {l.ghi_chu}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteLich(l)}
                          className="text-gray-300 transition hover:text-red-500"
                          title="Xoá lịch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {lichList.length === 0 && (
              <EmptyState message="Chưa có lịch nào được lập" />
            )}
          </div>
        </div>
      )} */}

      {/* ── Trưởng phòng theo dõi tuân thủ lịch ── */}
      {/* Hiện cho Admin (toàn viện) VÀ Trưởng khoa/phòng có quyền phân công lịch
          (canManage) — dữ liệu lichList đã được BACKEND lọc sẵn theo khoa của
          người đăng nhập nếu không phải full-scope, nên hiển thị an toàn, không lộ
          dữ liệu khoa khác. */}
      {!loading && (isAdmin || canManage) && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              📊 Trưởng phòng theo dõi tuân thủ lịch
            </h3>
            <div className="flex gap-2">
              <select
                className={inputCls}
                style={{ fontSize: 12, padding: "3px 8px" }}
                value={ttRange}
                onChange={(e) => setTtRange(e.target.value as "week" | "all")}
              >
                <option value="week">Tuần này</option>
                <option value="all">Tất cả (60 ngày)</option>
              </select>
              <select
                className={inputCls}
                style={{ fontSize: 12, padding: "3px 8px", minWidth: 160 }}
                value={ttNguoi}
                onChange={(e) => setTtNguoi(e.target.value)}
              >
                <option value="">— Tất cả cán bộ —</option>
                {canBoOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email || u.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-5">
            {/* KPI */}
            <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label="📋 Tổng lịch" value={ttKpi.total} accent="navy" />
              <KpiCard
                label="✅ Đã hoàn thành"
                value={ttKpi.done}
                accent="green"
              />
              <KpiCard
                label="❌ Chưa thực hiện"
                value={ttKpi.miss}
                accent="red"
              />
              <KpiCard
                label="⏳ Sắp tới"
                value={ttKpi.upcoming}
                accent="yellow"
              />
            </div>

            {/* Tóm tắt theo cán bộ */}
            {!ttNguoi && ttSummary.length > 0 && (
              <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tổng hợp theo cán bộ
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 dark:border-gray-700">
                        <th className="px-3 py-2 font-medium">Cán bộ</th>
                        <th className="px-3 py-2 text-center font-medium">
                          Tổng
                        </th>
                        <th className="px-3 py-2 text-center font-medium">
                          ✅
                        </th>
                        <th className="px-3 py-2 text-center font-medium">
                          ❌
                        </th>
                        <th className="px-4 py-2 font-medium">Hoàn thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ttSummary.map((s) => (
                        <tr
                          key={s.name}
                          className="border-b border-gray-50 last:border-0 dark:border-gray-800/50"
                        >
                          <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">
                            {s.name}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                            {s.total}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {s.done}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-red-600 dark:text-red-400">
                            {s.miss}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className={`h-full rounded-full ${
                                    s.pct >= 80
                                      ? "bg-emerald-500"
                                      : s.pct >= 50
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${s.pct}%` }}
                                />
                              </div>
                              <span
                                className={`min-w-[32px] text-xs font-bold ${
                                  s.pct >= 80
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : s.pct >= 50
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {s.pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Chi tiết từng lịch */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                    <th className="px-4 py-3 font-medium">Ngày</th>
                    <th className="px-4 py-3 font-medium">Khoa/Phòng</th>
                    <th className="px-4 py-3 font-medium">Vị trí</th>
                    <th className="px-4 py-3 font-medium">Cán bộ phụ trách</th>
                    <th className="px-4 py-3 font-medium">Loại</th>
                    <th className="px-4 py-3 font-medium">Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {ttDetail.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        Không có lịch trong khoảng này
                      </td>
                    </tr>
                  )}
                  {ttDetail.map((g) => {
                    const { lich: l, date } = g;
                    const done = g.items.some((li) => isDone(li, date));
                    const isPast = date <= todayStr;
                    const isToday = date === todayStr;
                    const names = g.items.map(tenNguoi).filter(Boolean);
                    return (
                      <tr
                        key={g.key}
                        className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40 ${
                          isToday
                            ? "bg-brand-25 font-semibold dark:bg-brand-500/5"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {fmtVNFromDateStr(date)}
                          {isToday && " 📍"}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                          {l.khoa?.ten_khoa}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {l.vitri_type?.ten_vitri || "Tất cả"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          <div className="flex flex-wrap gap-1">
                            {names.length > 0 ? (
                              names.map((n, i) => (
                                <span
                                  key={i}
                                  className="inline-block rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-normal text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  {n}
                                </span>
                              ))
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              l.loai_lich === "dinh_ky"
                                ? "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
                                : l.loai_lich === "dot_xuat"
                                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                            }`}
                          >
                            {l.loai_lich === "dinh_ky"
                              ? "Định kỳ"
                              : l.loai_lich === "dot_xuat"
                                ? "Đột xuất"
                                : "Một lần"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                              done
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                : isPast
                                  ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {done
                              ? "✅ Đã đánh giá"
                              : isPast
                                ? "❌ Chưa thực hiện"
                                : "⏳ Chưa đến"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal thêm / sửa lịch ── */}
      <Modal
        open={modalOpen}
        title={mEditGroup ? "Sửa lịch đánh giá" : "Thêm lịch đánh giá"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              className={btnSecondary}
              onClick={() => setModalOpen(false)}
            >
              Huỷ
            </button>
            <button
              className={btnPrimary}
              onClick={saveLich}
              disabled={savingLich}
            >
              {savingLich
                ? "Đang lưu..."
                : mEditGroup
                  ? "Lưu thay đổi"
                  : "Lưu lịch"}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Loại lịch (Đợt đánh giá)">
            <select
              className={inputCls}
              value={mDotDanhGiaId}
              onChange={(e) =>
                setMDotDanhGiaId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— Chọn đợt đánh giá —</option>
              {modalDotOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ten_dot}
                </option>
              ))}
            </select>
            {dotDanhGiaList.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-500">
                Chưa có đợt đánh giá nào đang mở — vào Cấu hình {">"} Đợt đánh
                giá để tạo trước.
              </p>
            )}
          </Field>
          <Field
            label={
              mType === "dinh_ky" ? "Ngày bắt đầu định kỳ" : "Ngày đánh giá"
            }
          >
            <input
              type="date"
              className={inputCls}
              value={mNgay}
              min={selectedDot?.tu_ngay || undefined}
              max={selectedDot?.den_ngay || undefined}
              onChange={(e) => setMNgay(e.target.value)}
            />
            {selectedDot?.tu_ngay && selectedDot?.den_ngay && (
              <p className="mt-1 text-[11px] text-gray-400">
                Trong khoảng {fmtVNFromDateStr(selectedDot.tu_ngay)} –{" "}
                {fmtVNFromDateStr(selectedDot.den_ngay)} (theo đợt đã chọn)
              </p>
            )}
          </Field>
          {mType === "dinh_ky" && (
            <Field label="Thứ trong tuần (tự động theo ngày đã chọn)">
              <div
                className={`${inputCls} bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400`}
              >
                {THU_LABEL[mThu]} — lặp lại hàng tuần kể từ ngày trên
              </div>
            </Field>
          )}
          <Field
            label={
              isAdmin
                ? "Khoa / Phòng / TT"
                : "Khoa / Phòng / TT (khoa của bạn — không đổi được)"
            }
          >
            <SearchableSelect
              value={mKhoa}
              onChange={setMKhoa}
              options={khoaList.map((k) => ({
                value: k.id,
                label: k.ten_khoa,
              }))}
              placeholder="— Chọn khoa —"
              disabled={!isAdmin}
            />
          </Field>
          <Field label="Vị trí đánh giá (theo cấu hình khoa)">
            <select
              className={inputCls}
              value={mVitri}
              onChange={(e) =>
                setMVitri(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— Tất cả vị trí —</option>
              {mConfigTypes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.ten_vitri}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={`Người phụ trách (${mNguoi.length} đã chọn — Tích chọn 1 hoặc nhiều người)`}
          >
            <div className="relative mb-1.5">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className={`${inputCls} w-full pl-9`}
                value={mNguoiSearch}
                onChange={(e) => setMNguoiSearch(e.target.value)}
                placeholder="Gõ tên để lọc nhanh cán bộ..."
              />
            </div>
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
              {nguoiOptions.map((u) => {
                const on = mNguoi.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() =>
                      setMNguoi((p) =>
                        on ? p.filter((x) => x !== u.id) : [...p, u.id],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      on
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {u.email || u.username}
                  </button>
                );
              })}
              {nguoiOptions.length === 0 && (
                <p className="text-xs text-gray-400">
                  {mKhoa === ""
                    ? "Hãy chọn Khoa/Phòng/TT trước để hiển thị danh sách cán bộ"
                    : mNguoiSearch.trim()
                      ? "Không tìm thấy cán bộ phù hợp"
                      : "Không có cán bộ nào trong phạm vi quyền của bạn"}
                </p>
              )}
            </div>
          </Field>
          <Field label="Ghi chú">
            <input
              className={inputCls}
              value={mGhiChu}
              onChange={(e) => setMGhiChu(e.target.value)}
              placeholder="VD: Kiểm tra theo chỉ đạo GĐ..."
            />
          </Field>
          {modalError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              ✗ {modalError}
            </p>
          )}
        </div>
      </Modal>

      {/* ── Modal xác nhận xoá lịch ── */}
      <Modal
        open={!!confirmDeleteGroup}
        title="Xoá lịch đánh giá"
        onClose={() => setConfirmDeleteGroup(null)}
        footer={
          <>
            <button
              className={btnSecondary}
              onClick={() => setConfirmDeleteGroup(null)}
              disabled={deletingGroup}
            >
              Huỷ
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              onClick={() =>
                confirmDeleteGroup && deleteLichGroup(confirmDeleteGroup)
              }
              disabled={deletingGroup}
            >
              {deletingGroup ? "Đang xoá..." : "Xoá lịch"}
            </button>
          </>
        }
      >
        {confirmDeleteGroup && (
          <div className="grid gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Bạn có chắc chắn muốn xoá lịch đánh giá này? Hành động này không
              thể hoàn tác.
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                {confirmDeleteGroup.khoa?.ten_khoa}
              </p>
              {confirmDeleteGroup.vitri_type?.ten_vitri && (
                <p className="text-xs text-gray-400">
                  {confirmDeleteGroup.vitri_type.ten_vitri}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Cán bộ phụ trách:{" "}
                {confirmDeleteGroup.items
                  .map(tenNguoi)
                  .filter(Boolean)
                  .join(", ") || "—"}
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

      {/* ── Modal "Xem thêm" — đủ lịch của 1 ngày (khi ngày đó có > 10 buổi) ── */}
      <Modal
        open={!!dayModalDate}
        title={
          dayModalDate
            ? `Lịch ngày ${fmtVN(dayModalDate)}${fmt(dayModalDate) === todayStr ? " • Hôm nay" : ""}`
            : "Lịch trong ngày"
        }
        onClose={() => setDayModalDate(null)}
      >
        {dayModalDate && (
          <div className="grid gap-2 sm:grid-cols-2">
            {groupLich(lichForDay(dayModalDate)).map((g) =>
              renderLichCard(g, dayModalDate),
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
