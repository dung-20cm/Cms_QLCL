// Toàn bộ state + dữ liệu tính toán của trang Tổng hợp kết quả (bộ lọc, sắp
// xếp, phân trang, KPI, xuất Excel) -- tách khỏi index.tsx để component
// container chỉ còn lo render.
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useCatalog, useDanhGia } from "../../components/ui/PageShell";
import { usePagination } from "../../components/ui/Pagination";
import { PERMISSION } from "../../features/auth/permissions";
import { useHasPermission } from "../../features/auth/usePermission";
import { fetchDotDanhGiaList } from "../../features/qlcl/api";
import { loadDanhGia } from "../../features/qlcl/danhGiaSlice";
import {
  ExcelJS,
  downloadWorkbook,
  styleDataRow,
  styleHeaderRow,
} from "../../features/qlcl/excelExport";
import { findKhoaQlclId } from "../../features/qlcl/lichUtils";
import type { DanhGia, DotDanhGia } from "../../features/qlcl/types";
import { DOT_DANH_GIA_OPTIONS } from "../../features/qlcl/types";
import type { SortKey } from "./types";

export function useTongHopData() {
  const { khoaList, vitriTypes } = useCatalog();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // Dữ liệu lấy từ cache Redux dùng chung (danhGiaSlice) -- không tự gọi API
  // riêng nữa, tránh gọi lại nếu trang khác đã tải sẵn cùng dữ liệu này.
  const { rows, status, error } = useDanhGia();
  const loading = status === "idle" || status === "loading";

  // Trưởng khoa/Nhân viên: chỉ xem tổng hợp của ĐÚNG khoa/phòng mình, không
  // browse được khoa khác. Admin/Lãnh đạo/Phòng QLCL: mặc định xem khoa Phòng
  // QLCL nhưng vẫn chọn được khoa khác qua ô select (giống LichDanhGia.tsx).
  const isRealAdmin = useHasPermission(PERMISSION.TAO_TAI_KHOAN);
  const isAdminOrLanhDao = useHasPermission(PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH);
  const isQlcl = useHasPermission(PERMISSION.XEM_TONG_HOP_TAT_CA_KHOA) && !isRealAdmin;
  const canBrowseKhoa = isAdminOrLanhDao || isQlcl;
  const khoaQlclId = useMemo(() => findKhoaQlclId(khoaList), [khoaList]);

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fKhoa, setFKhoa] = useState("");
  const [fVitri, setFVitri] = useState("");
  const [fDot, setFDot] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  // Mặc định khoá fKhoa: Admin/Lãnh đạo/QLCL -> Phòng QLCL (chỉ khoá 1 LẦN,
  // vẫn cho tự đổi qua select sau đó); Trưởng khoa/Nhân viên -> khoa mình,
  // khoá cứng ở effectiveFKhoa bên dưới (không cho đổi).
  const didLockFKhoaRef = useRef(false);
  useEffect(() => {
    if (didLockFKhoaRef.current) return;
    if (!canBrowseKhoa || khoaQlclId == null) return;
    setFKhoa(String(khoaQlclId));
    didLockFKhoaRef.current = true;
  }, [canBrowseKhoa, khoaQlclId]);
  const effectiveFKhoa = canBrowseKhoa ? fKhoa : String(user?.khoa_id ?? "");

  // const dotOptions = useMemo(
  //   () => [...new Set(rows.map((r) => r.dot_danh_gia))].sort(),
  //   [rows],
  // );

  const [dotList, setDotList] = useState<DotDanhGia[]>([]);
  useEffect(() => {
    fetchDotDanhGiaList({ trang_thai: "dang-mo" })
      .then((res) => {
        setDotList(res.rows);
      })
      .catch(() => setDotList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotOptions =
    dotList.length > 0 ? dotList.map((d) => d.ten_dot) : DOT_DANH_GIA_OPTIONS;

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (fFrom && r.ngay_danh_gia < fFrom) return false;
      if (fTo && r.ngay_danh_gia > fTo) return false;
      // Lọc theo khoa/phòng CỦA NGƯỜI ĐÁNH GIÁ (không phải khoa được đánh giá) --
      // chọn "Phòng Tài chính – Kế toán" nghĩa là xem các lượt do CHÍNH nhân
      // viên phòng đó thực hiện, không phải các lượt QLCL đi đánh giá phòng đó.
      if (effectiveFKhoa && String(r.nguoi_danh_gia?.khoa_id ?? "") !== effectiveFKhoa) return false;
      if (fVitri && String(r.vitri_type_id) !== fVitri) return false;
      if (fDot && r.dot_danh_gia !== fDot) return false;
      return true;
    });
    const bySort: Record<SortKey, (a: DanhGia, b: DanhGia) => number> = {
      newest: (a, b) =>
        b.ngay_danh_gia.localeCompare(a.ngay_danh_gia) || b.id - a.id,
      oldest: (a, b) =>
        a.ngay_danh_gia.localeCompare(b.ngay_danh_gia) || a.id - b.id,
      rank_desc: (a, b) => b.pct - a.pct,
      rank_asc: (a, b) => a.pct - b.pct,
      khoa: (a, b) =>
        (a.khoa?.ten_khoa || "").localeCompare(b.khoa?.ten_khoa || "", "vi"),
    };
    return [...list].sort(bySort[sort]);
  }, [rows, fFrom, fTo, effectiveFKhoa, fVitri, fDot, sort]);

  const {
    page,
    setPage,
    totalPages,
    pageItems: pagedRows,
    pageSize,
    totalItems,
  } = usePagination(filtered, {
    resetKey: `${fFrom}|${fTo}|${fKhoa}|${fVitri}|${fDot}|${sort}`,
  });

  const kpi = useMemo(() => {
    const n = filtered.length;
    if (!n)
      return { n: 0, hasData: false, okPct: 0, avg: 0, best: "–", bestAvg: 0 };
    const ok = filtered.filter((r) => r.pct >= 85).length;
    const avg = Math.round(filtered.reduce((s, r) => s + r.pct, 0) / n);
    const byKhoa = new Map<string, { sum: number; n: number }>();
    for (const r of filtered) {
      const k = r.khoa?.ten_khoa || String(r.khoa_id);
      const cur = byKhoa.get(k) || { sum: 0, n: 0 };
      cur.sum += r.pct;
      cur.n++;
      byKhoa.set(k, cur);
    }
    let best = "–";
    let bestAvg = -1;
    for (const [k, v] of byKhoa) {
      const a = v.sum / v.n;
      if (a > bestAvg) {
        bestAvg = a;
        best = k;
      }
    }
    return {
      n,
      hasData: true,
      okPct: Math.round((ok / n) * 100),
      avg,
      best,
      bestAvg: Math.round(bestAvg),
    };
  }, [filtered]);

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Xuất file Excel (.xlsx) thật (thay CSV thô trước đây) — header navy đậm,
  // viền đủ 4 cạnh, tô xen kẽ dòng, đồng bộ phong cách với các trang khác.
  async function exportExcel() {
    setExportingExcel(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Tổng hợp 5S");

      ws.columns = [
        { header: "STT", key: "stt", width: 7 },
        { header: "Ngày", key: "ngay", width: 13 },
        { header: "Khoa / Phòng", key: "khoa", width: 32 },
        { header: "Vị trí", key: "viTri", width: 26 },
        { header: "Đợt", key: "dot", width: 22 },
        { header: "Người đánh giá", key: "nguoiDG", width: 30 },
        { header: "Đạt / Tổng", key: "datTong", width: 13 },
        { header: "% Đạt", key: "pct", width: 10 },
        { header: "Xếp loại", key: "xepLoai", width: 16 },
      ];
      styleHeaderRow(ws.getRow(1));

      filtered.forEach((r, idx) => {
        const row = ws.addRow({
          stt: idx + 1,
          ngay: new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN"),
          khoa: r.khoa?.ten_khoa || "",
          viTri: [r.vitri_type?.ten_vitri, r.vitri_chi_tiet?.ma_vitri]
            .filter(Boolean)
            .join(" · "),
          dot: r.dot_danh_gia,
          nguoiDG: [
            r.nguoi_danh_gia?.email || r.nguoi_danh_gia?.username,
            ...(r.dong_danh_gia?.map((u) => u.email || u.username) || []),
          ]
            .filter(Boolean)
            .join(", "),
          datTong: `${r.so_tieu_chi_dat}/${r.so_tieu_chi_tong}`,
          pct: r.pct,
          xepLoai: r.xep_loai,
        });
        styleDataRow(row, idx, ["stt", "ngay", "datTong", "pct", "xepLoai"]);
        const color =
          r.pct >= 90
            ? "FF15803D"
            : r.pct >= 75
              ? "FF0369A1"
              : r.pct >= 60
                ? "FFB45309"
                : "FFDC2626";
        row.getCell("pct").font = { bold: true, color: { argb: color } };
        row.getCell("xepLoai").font = { bold: true, color: { argb: color } };
      });

      ws.views = [{ state: "frozen", ySplit: 1 }];
      ws.autoFilter = { from: "A1", to: "I1" };

      await downloadWorkbook(
        wb,
        `tong_hop_5s_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Xuất Excel thất bại",
      );
    } finally {
      setExportingExcel(false);
    }
  }

  function resetFilters() {
    setFFrom("");
    setFTo("");
    setFKhoa("");
    setFVitri("");
    setFDot("");
    setSort("newest");
  }

  function retryLoad() {
    dispatch(loadDanhGia());
  }

  return {
    khoaList,
    vitriTypes,
    retryLoad,
    error,
    exportError,
    loading,
    canBrowseKhoa,
    fFrom,
    setFFrom,
    fTo,
    setFTo,
    fKhoa,
    setFKhoa,
    effectiveFKhoa,
    fVitri,
    setFVitri,
    fDot,
    setFDot,
    dotOptions,
    sort,
    setSort,
    resetFilters,
    filtered,
    page,
    setPage,
    totalPages,
    pagedRows,
    pageSize,
    totalItems,
    kpi,
    exportingExcel,
    exportExcel,
  };
}

export type TongHopData = ReturnType<typeof useTongHopData>;
