import { useMemo, useState, useEffect, useRef } from "react";
import { Table2, Download, RotateCcw } from "lucide-react";
import {
  ExcelJS,
  styleHeaderRow,
  styleDataRow,
  downloadWorkbook,
} from "../features/qlcl/excelExport";
import {
  PageHeader,
  KpiCard,
  Field,
  inputCls,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
  useDanhGia,
} from "../components/ui/PageShell";
import { fetchDotDanhGiaList } from "../features/qlcl/api";
import SearchableSelect from "../components/ui/SearchableSelect";
import Pagination, { usePagination } from "../components/ui/Pagination";
import CountUp from "../components/ui/CountUp";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loadDanhGia } from "../features/qlcl/danhGiaSlice";
import { findKhoaQlclId } from "../features/qlcl/lichUtils";
import type { DanhGia, DotDanhGia } from "../features/qlcl/types";
import {
  DOT_DANH_GIA_OPTIONS,
  toneBadgeClass,
  toneFromPct,
} from "../features/qlcl/types";
import { PERMISSION } from "../features/auth/permissions";
import { useHasPermission } from "../features/auth/usePermission";
// import type { DotDanhGia } from "../features/qlcl/types";

type SortKey = "newest" | "oldest" | "rank_desc" | "rank_asc" | "khoa";

export default function TongHop() {
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

  return (
    <div>
      <PageHeader
        icon={<Table2 size={22} />}
        title="Tổng hợp kết quả"
        subtitle="So sánh điểm 5S giữa các khoa/phòng trong một đợt hoặc khoảng thời gian — xếp hạng và xuất báo cáo"
        actions={
          <button
            className={btnSecondary}
            onClick={exportExcel}
            disabled={!filtered.length || exportingExcel}
          >
            <Download size={15} />{" "}
            {exportingExcel ? "Đang xuất..." : "Xuất Excel"}
          </button>
        }
      />
      {error && (
        <ErrorBanner message={error} onRetry={() => dispatch(loadDanhGia())} />
      )}
      {exportError && <ErrorBanner message={exportError} />}

      {/* ── Bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Từ ngày">
          <input
            type="date"
            className={inputCls}
            value={fFrom}
            onChange={(e) => setFFrom(e.target.value)}
          />
        </Field>
        <Field label="Đến ngày">
          <input
            type="date"
            className={inputCls}
            value={fTo}
            onChange={(e) => setFTo(e.target.value)}
          />
        </Field>
        <Field label="Khoa / Phòng">
          <SearchableSelect
            value={effectiveFKhoa}
            onChange={(v) => setFKhoa(v)}
            options={khoaList.map((k) => ({
              value: String(k.id),
              label: k.ten_khoa,
            }))}
            placeholder="— Tất cả —"
            disabled={!canBrowseKhoa}
          />
        </Field>
        <Field label="Vị trí">
          <select
            className={inputCls}
            value={fVitri}
            onChange={(e) => setFVitri(e.target.value)}
          >
            <option value="">— Tất cả —</option>
            {vitriTypes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.ten_vitri}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Đợt đánh giá">
          <select
            className={inputCls}
            value={fDot}
            onChange={(e) => setFDot(e.target.value)}
          >
            <option value="">— Tất cả —</option>
            {dotOptions.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Sắp xếp">
          <select
            className={inputCls}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">🕐 Mới nhất lên trên</option>
            <option value="oldest">🕐 Cũ nhất lên trên</option>
            <option value="rank_desc">🏆 Điểm cao → thấp</option>
            <option value="rank_asc">↓ Điểm thấp → cao</option>
            <option value="khoa">🏥 Theo tên đơn vị</option>
          </select>
        </Field>
        <button className={btnSecondary} onClick={resetFilters}>
          <RotateCcw size={14} /> Xoá lọc
        </button>
        <span className="pb-2 text-xs text-gray-400">
          {filtered.length} lượt
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Tổng lượt đánh giá"
          value={<CountUp value={kpi.n} />}
          sub="lượt"
          accent="navy"
          delay={0}
        />
        <KpiCard
          label="Đạt tốt (≥85%)"
          value={kpi.hasData ? <CountUp value={kpi.okPct} suffix="%" /> : "–"}
          sub="tỷ lệ"
          accent="green"
          delay={70}
        />
        <KpiCard
          label="Tỷ lệ đạt trung bình"
          value={kpi.hasData ? <CountUp value={kpi.avg} suffix="%" /> : "–"}
          accent="blue"
          delay={140}
        />
        <KpiCard
          label="Đơn vị tốt nhất"
          value={<span className="text-base">{kpi.best}</span>}
          sub={kpi.hasData ? `TB ${kpi.bestAvg}%` : ""}
          accent="yellow"
          delay={210}
        />
      </div>

      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Table2 size={36} />}
          message="Chưa có dữ liệu — hoàn thành bảng kiểm và bấm Lưu kết quả"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Ngày</th>
                  <th className="px-4 py-3 font-medium">Khoa / Phòng</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium">Đợt</th>
                  <th className="px-4 py-3 font-medium">Người ĐG</th>
                  <th className="px-4 py-3 font-medium">Tiêu chí</th>
                  <th className="px-4 py-3 font-medium">% Đạt</th>
                  <th className="px-4 py-3 font-medium">Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-3 text-gray-400">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                      {r.khoa?.ten_khoa}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.vitri_type?.ten_vitri}
                      {r.vitri_chi_tiet?.ma_vitri && (
                        <span className="text-gray-300">
                          {" "}
                          · {r.vitri_chi_tiet.ma_vitri}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.dot_danh_gia}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {[
                        r.nguoi_danh_gia?.email,
                        ...(r.dong_danh_gia?.map((u) => u.email) || []),
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {r.so_tieu_chi_dat}/{r.so_tieu_chi_tong}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full ${r.pct >= 90 ? "bg-emerald-500" : r.pct >= 75 ? "bg-sky-500" : r.pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${r.pct}%` }}
                          />
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {r.pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneBadgeClass[toneFromPct(r.pct)]}`}
                      >
                        {r.xep_loai}
                      </span>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}
