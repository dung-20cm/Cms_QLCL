// Toàn bộ state + dữ liệu tính toán của trang Lịch đánh giá (lịch tuần, phân
// công hôm nay, theo dõi tuân thủ, modal thêm/sửa/xoá...) -- tách khỏi
// index.tsx để component container chỉ còn lo phần render.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useCatalog } from "../../components/ui/PageShell";
import { PERMISSION } from "../../features/auth/permissions";
import { useHasPermission } from "../../features/auth/usePermission";
import {
  createUpdateLichPhanCong,
  fetchDanhGiaList,
  fetchDotDanhGiaList,
  fetchLichPhanCongList,
} from "../../features/qlcl/api";
import { groupLich, isLichDone } from "../../features/qlcl/lichUtils";
import type { LichGroup } from "../../features/qlcl/lichUtils";
import { invalidateTodayLich } from "../../features/qlcl/todayLichSlice";
import type { DanhGia, DotDanhGia, LichPhanCong } from "../../features/qlcl/types";
import { useKhoaViTri } from "../../features/qlcl/useKhoaViTri";
import { useToast } from "../../features/ui/useToast";
import { TAT_CA_VI_TRI_LABEL } from "./constants";
import { addDays, boDauVN, fmt, fmtVNFromDateStr, startOfWeek } from "./dateUtils";
import {
  effectiveStartDate,
  expandLichRange,
  groupTTExpanded,
  inferLoaiLichFromTenDot,
  tenNguoi,
} from "./lichHelpers";

export function useLichDanhGiaData() {
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

  return {
    khoaList,
    users,
    vitriTypes,
    currentUser,
    canManage,
    isAdmin,
    canBrowseKhoaCanBo,
    lichList,
    danhGiaList,
    dotDanhGiaList,
    loading,
    error,
    load,
    weekStart,
    setWeekStart,
    filterNguoi,
    setFilterNguoi,
    filterKhoaCanBo,
    setFilterKhoaCanBo,
    ttRange,
    setTtRange,
    ttNguoi,
    setTtNguoi,
    confirmDeleteGroup,
    setConfirmDeleteGroup,
    dayModalDate,
    setDayModalDate,
    deletingGroup,
    deleteError,
    setDeleteError,
    modalOpen,
    setModalOpen,
    mDotDanhGiaId,
    setMDotDanhGiaId,
    mEditGroup,
    modalDotOptions,
    selectedDot,
    mType,
    mNgay,
    setMNgay,
    mThu,
    mKhoa,
    setMKhoa,
    mVitri,
    setMVitri,
    mConfigTypes,
    mNguoi,
    setMNguoi,
    mNguoiSearch,
    setMNguoiSearch,
    mGhiChu,
    setMGhiChu,
    savingLich,
    modalError,
    canBoOptions,
    nguoiOptions,
    weekDays,
    weekEnd,
    lichForDay,
    isDone,
    today,
    todayStr,
    todayLich,
    kpi,
    ttKpi,
    ttSummary,
    ttDetail,
    openModal,
    openEditModal,
    saveLich,
    canManageThisView,
    deleteLichGroup,
  };
}

export type LichDanhGiaData = ReturnType<typeof useLichDanhGiaData>;
