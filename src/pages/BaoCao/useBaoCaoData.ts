// Toàn bộ state + dữ liệu tính toán (quyền xem, KPI, tuỳ chọn lọc, danh sách
// lượt theo từng loại báo cáo...) của trang Báo cáo -- tách khỏi index.tsx để
// component container chỉ còn lo phần render, không phải đọc qua hàng trăm
// dòng state/useMemo để hiểu logic. index.tsx chỉ cần gọi `useBaoCaoData()`.
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  useCatalog,
  useDanhGia,
  useKhacPhuc,
} from "../../components/ui/PageShell";
import { PERMISSION } from "../../features/auth/permissions";
import { useHasPermission } from "../../features/auth/usePermission";
import { fetchDotDanhGiaList } from "../../features/qlcl/api";
import { loadDanhGia } from "../../features/qlcl/danhGiaSlice";
import { loadKhacPhuc } from "../../features/qlcl/khacPhucSlice";
import { isSelfReview } from "../../features/qlcl/lichUtils";
import type { DotDanhGia, KhacPhuc } from "../../features/qlcl/types";
import type { RptType } from "./types";

export function useBaoCaoData() {
  const { khoaList } = useCatalog();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // Dữ liệu lấy từ cache Redux dùng chung (danhGiaSlice/khacPhucSlice) --
  // không tự gọi API riêng nữa.
  const danhGia = useDanhGia();
  const khacPhuc = useKhacPhuc();
  const rows = danhGia.rows;
  const kpRows = khacPhuc.rows;

  // Admin/Lãnh đạo/Phòng QLCL: xem được báo cáo của MỌI khoa, gồm cả 2 luồng
  // dữ liệu -- Phòng QLCL đi đánh giá khoa khác VÀ khoa/phòng tự đánh giá (xem
  // isSelfReview/isQlclAudit ở lichUtils.ts, cùng logic đã dùng để tách 2 luồng
  // lịch/đánh giá ở BangKiem.tsx). Trưởng khoa/Nhân viên: CHỈ xem báo cáo dữ
  // liệu khoa/phòng tự đánh giá của ĐÚNG khoa mình -- không xem được khoa khác,
  // cũng không xem lẫn dữ liệu do Phòng QLCL đánh giá khoa mình (luồng đó dành
  // riêng cho phía QLCL/Admin/Lãnh đạo theo dõi).
  const isRealAdmin = useHasPermission(PERMISSION.TAO_TAI_KHOAN);
  const isAdminOrLanhDao = useHasPermission(
    PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH,
  );
  const isQlclRole =
    useHasPermission(PERMISSION.XEM_TONG_HOP_TAT_CA_KHOA) && !isRealAdmin;
  const canViewAllKhoa = isAdminOrLanhDao || isQlclRole;

  const scopedRows = useMemo(() => {
    if (canViewAllKhoa) return rows;
    return rows.filter((r) => r.khoa_id === user?.khoa_id && isSelfReview(r));
  }, [rows, canViewAllKhoa, user?.khoa_id]);

  const loading =
    danhGia.status === "idle" ||
    danhGia.status === "loading" ||
    khacPhuc.status === "idle" ||
    khacPhuc.status === "loading";
  const error = danhGia.error || khacPhuc.error;
  function retryLoad() {
    dispatch(loadDanhGia());
    dispatch(loadKhacPhuc());
  }

  // "luot" (Báo cáo từng lượt đánh giá) đang tạm ẩn khỏi UI (xem card bị comment
  // ở dưới) -- đổi mặc định sang 'thang' để không mở app vào 1 loại báo cáo
  // không còn nút nào đang bật tương ứng.
  const [rptType, setRptType] = useState<RptType>("thang");
  const [selLuot, setSelLuot] = useState("");
  const [selThang, setSelThang] = useState("");
  const [selKhoa, setSelKhoa] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const [dvKhoa, setDvKhoa] = useState("");
  const [dvFrom, setDvFrom] = useState("");
  const [dvTo, setDvTo] = useState("");

  // ── Báo cáo theo đợt đánh giá ──
  const [dotDanhGiaAllList, setDotDanhGiaAllList] = useState<DotDanhGia[]>([]);
  useEffect(() => {
    fetchDotDanhGiaList()
      .then((res) => setDotDanhGiaAllList(res.rows))
      .catch(() => setDotDanhGiaAllList([]));
  }, []);
  const [selDotId, setSelDotId] = useState("");
  const [selDotKhoa, setSelDotKhoa] = useState("");
  const [dotNhanXet, setDotNhanXet] = useState("");

  // Trưởng khoa/Nhân viên: khoá cứng mọi ô chọn khoa về ĐÚNG khoa mình -- không
  // browse được báo cáo của khoa khác (select tương ứng bị disable ở JSX).
  const effectiveSelKhoa = canViewAllKhoa
    ? selKhoa
    : String(user?.khoa_id ?? "");
  const effectiveDvKhoa = canViewAllKhoa ? dvKhoa : String(user?.khoa_id ?? "");
  const effectiveSelDotKhoa = canViewAllKhoa
    ? selDotKhoa
    : String(user?.khoa_id ?? "");

  // ── Phiếu yêu cầu khắc phục (gửi đơn vị) ──
  const [gkMode, setGkMode] = useState<"ngay" | "luot">("ngay");
  const [gkNgay, setGkNgay] = useState("");
  const [gkKhoa, setGkKhoa] = useState("");
  const [gkLuot, setGkLuot] = useState("");
  const [gkHanDays, setGkHanDays] = useState(5);

  // KPI hôm nay
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const kpiToday = useMemo(() => {
    const todayRows = scopedRows.filter((r) => r.ngay_danh_gia === today);
    return {
      today: todayRows.length,
      ok: todayRows.filter((r) => r.pct >= 85).length,
      kp: todayRows.filter((r) => r.so_tieu_chi_dat < r.so_tieu_chi_tong)
        .length,
      month: scopedRows.filter((r) => r.ngay_danh_gia.startsWith(thisMonth))
        .length,
    };
  }, [scopedRows, today, thisMonth]);

  const thangOptions = useMemo(
    () =>
      [...new Set(scopedRows.map((r) => r.ngay_danh_gia.slice(0, 7)))]
        .sort()
        .reverse(),
    [scopedRows],
  );

  const luot = scopedRows.find((r) => String(r.id) === selLuot);
  const luotKP = useMemo(
    () => kpRows.filter((k) => k.danh_gia_chi_tiet?.danh_gia_id === luot?.id),
    [kpRows, luot],
  );

  const thangRows = useMemo(() => {
    if (!selThang) return [];
    return scopedRows
      .filter(
        (r) =>
          r.ngay_danh_gia.startsWith(selThang) &&
          (!effectiveSelKhoa || String(r.khoa_id) === effectiveSelKhoa),
      )
      .sort((a, b) => b.pct - a.pct);
  }, [scopedRows, selThang, effectiveSelKhoa]);

  // Toàn bộ lượt đánh giá thuộc đúng 1 đợt đánh giá (dot_danh_gia_id) + 1 khoa
  // đã chọn -- dùng cho card "Báo cáo theo đợt đánh giá".
  const dotRows = useMemo(() => {
    if (!selDotId || !effectiveSelDotKhoa) return [];
    return scopedRows
      .filter(
        (r) =>
          String(r.dot_danh_gia_id) === selDotId &&
          String(r.khoa_id) === effectiveSelDotKhoa,
      )
      .sort((a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia));
  }, [scopedRows, selDotId, effectiveSelDotKhoa]);

  const donViRows = useMemo(() => {
    if (!effectiveDvKhoa) return [];
    return scopedRows
      .filter((r) => {
        if (String(r.khoa_id) !== effectiveDvKhoa) return false;
        if (dvFrom && r.ngay_danh_gia < dvFrom) return false;
        if (dvTo && r.ngay_danh_gia > dvTo) return false;
        return true;
      })
      .sort((a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia));
  }, [scopedRows, effectiveDvKhoa, dvFrom, dvTo]);

  // ── Phiếu yêu cầu khắc phục: 2 chế độ chọn dữ liệu ──
  // "Theo ngày": chọn 1 ngày đánh giá -> chỉ hiện các khoa CÓ đánh giá đúng ngày đó
  // (đếm theo toàn viện, không lọc khoa trước) -- tự chọn sẵn nếu ngày đó chỉ có
  // đúng 1 khoa được đánh giá (đỡ phải bấm thêm 1 bước).
  const gkNgayOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of scopedRows)
      map.set(r.ngay_danh_gia, (map.get(r.ngay_danh_gia) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [scopedRows]);

  const gkKhoaOptionsForNgay = useMemo(() => {
    if (!gkNgay) return [] as { khoa_id: number; name: string; n: number }[];
    const map = new Map<number, { name: string; n: number }>();
    for (const r of scopedRows) {
      if (r.ngay_danh_gia !== gkNgay) continue;
      const cur = map.get(r.khoa_id) || {
        name: r.khoa?.ten_khoa || String(r.khoa_id),
        n: 0,
      };
      cur.n++;
      map.set(r.khoa_id, cur);
    }
    return [...map.entries()]
      .map(([khoa_id, v]) => ({ khoa_id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [scopedRows, gkNgay]);

  useEffect(() => {
    setGkKhoa(
      gkKhoaOptionsForNgay.length === 1
        ? String(gkKhoaOptionsForNgay[0].khoa_id)
        : "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reset khi đổi NGÀY, không phải khi danh sách khoa tính lại
  }, [gkNgay]);

  const gkRecs = useMemo(() => {
    if (gkMode === "luot") {
      const r = scopedRows.find((x) => String(x.id) === gkLuot);
      return r ? [r] : [];
    }
    if (!gkNgay || !gkKhoa) return [];
    return scopedRows.filter(
      (r) => r.ngay_danh_gia === gkNgay && String(r.khoa_id) === gkKhoa,
    );
  }, [gkMode, gkLuot, gkNgay, gkKhoa, scopedRows]);

  // Tiêu chí chưa đạt của 1 lượt đánh giá = các dòng khac_phuc gắn với lượt đó
  // (khac_phuc chỉ tự tạo cho tiêu chí ✗ khi lưu Bảng kiểm — xem BangKiem.tsx/danhGia.service.js)
  const kpByDanhGiaId = useMemo(() => {
    const m = new Map<number, KhacPhuc[]>();
    for (const k of kpRows) {
      const id = k.danh_gia_chi_tiet?.danh_gia_id;
      if (id == null) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(k);
    }
    return m;
  }, [kpRows]);

  // Gộp toàn bộ hành động khắc phục của các lượt trong dotRows (giống cách
  // GuiKhoaReport gộp nhiều recs) -- dùng cho mục "III. Hành động khắc phục"
  // của báo cáo theo đợt.
  const dotKPList = useMemo(
    () => dotRows.flatMap((r) => kpByDanhGiaId.get(r.id) || []),
    [dotRows, kpByDanhGiaId],
  );

  const showPreview =
    (rptType === "luot" && !!luot) ||
    (rptType === "thang" && !!selThang) ||
    (rptType === "donvi" && !!effectiveDvKhoa) ||
    (rptType === "dot" && dotRows.length > 0) ||
    (rptType === "guikhoa" && gkRecs.length > 0);

  return {
    khoaList,
    rows,
    scopedRows,
    canViewAllKhoa,
    loading,
    error,
    retryLoad,
    rptType,
    setRptType,
    selLuot,
    setSelLuot,
    selThang,
    setSelThang,
    selKhoa,
    setSelKhoa,
    nhanXet,
    setNhanXet,
    dvKhoa,
    setDvKhoa,
    dvFrom,
    setDvFrom,
    dvTo,
    setDvTo,
    dotDanhGiaAllList,
    selDotId,
    setSelDotId,
    selDotKhoa,
    setSelDotKhoa,
    dotNhanXet,
    setDotNhanXet,
    gkMode,
    setGkMode,
    gkNgay,
    setGkNgay,
    gkKhoa,
    setGkKhoa,
    gkLuot,
    setGkLuot,
    gkHanDays,
    setGkHanDays,
    effectiveSelKhoa,
    effectiveDvKhoa,
    effectiveSelDotKhoa,
    today,
    kpiToday,
    thangOptions,
    luot,
    luotKP,
    thangRows,
    dotRows,
    donViRows,
    gkNgayOptions,
    gkKhoaOptionsForNgay,
    gkRecs,
    kpByDanhGiaId,
    dotKPList,
    showPreview,
  };
}

export type BaoCaoData = ReturnType<typeof useBaoCaoData>;
