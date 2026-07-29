import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ImageIcon,
  Plus,
  Download,
  Printer,
  FileText,
  RotateCcw,
} from "lucide-react";
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
  Modal,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  useCatalog,
} from "../components/ui/PageShell";
import SearchableSelect from "../components/ui/SearchableSelect";
import {
  fetchAnh5sTuanList,
  createUpdateAnh5sTuan,
  exportBaoCaoZaloHTML,
  exportBaoCaoZaloWord,
} from "../features/qlcl/api";
import type { Anh5sTuan } from "../features/qlcl/types";
import { useKhoaViTri } from "../features/qlcl/useKhoaViTri";
import { useIsViewOnly } from "../features/auth/usePermission";
import { useToast } from "../features/ui/useToast";

// Thứ 2 đầu tuần của 1 ngày bất kỳ
function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  return x.toISOString().slice(0, 10);
}

const CHAT_LUONG_OPTIONS = [
  { value: "Tốt", label: "✅ Tốt — đúng góc, rõ nét, đủ nội dung" },
  { value: "Trung bình", label: "⚠ Trung bình — thiếu 1 số tiêu chí" },
  { value: "Chưa đạt", label: "❌ Chưa đạt — mờ, thiếu nhiều, sai vị trí" },
];

function clBadge(cl: string) {
  const v = cl?.toLowerCase() || "";
  if (v.includes("tốt") || v === "tot")
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (
    v.includes("trung") ||
    v.includes("kha") ||
    v.includes("khá") ||
    v === "tb"
  )
    return "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
}

export default function Zalo5S() {
  const isViewOnly = useIsViewOnly();
  const toast = useToast();
  const { khoaList } = useCatalog();
  const [records, setRecords] = useState<Anh5sTuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTuan, setFilterTuan] = useState("");
  const [filterKhoa, setFilterKhoa] = useState<number | "">("");

  // Modal ghi nhận
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Anh5sTuan | null>(null);
  const [mKhoa, setMKhoa] = useState<number | "">("");
  // Vị trí hiển thị theo cấu hình khoa (trang Cấu hình > mục 1)
  const { types: mConfigTypes } = useKhoaViTri(mKhoa);
  const [mTuan, setMTuan] = useState(mondayOf(new Date()));
  const [mSoAnh, setMSoAnh] = useState(0);
  const [mViTri, setMViTri] = useState<number[]>([]);
  const [mChatLuong, setMChatLuong] = useState("Tốt");
  const [mGhiChu, setMGhiChu] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Xuất báo cáo (backend render theo mẫu 5S_Dashboard_BVTB_v4)
  const [exporting, setExporting] = useState<"html" | "word" | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAnh5sTuanList()
      .then((res) => setRecords(res.rows.filter((r) => r.active !== 0)))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Không tải được dữ liệu"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const tuanOptions = useMemo(
    () => [...new Set(records.map((r) => r.tuan))].sort().reverse(),
    [records],
  );
  const activeTuan = filterTuan || tuanOptions[0] || mondayOf(new Date());

  const weekMap = useMemo(() => {
    const map = new Map<number, Anh5sTuan>();
    for (const r of records) {
      if (r.tuan === activeTuan) map.set(r.khoa_id, r);
    }
    return map;
  }, [records, activeTuan]);

  // Danh sách khoa hiển thị trong bảng + xuất file — thu hẹp theo bộ lọc Khoa/Phòng
  // (KPI tổng quan phía trên vẫn tính trên toàn viện, không phụ thuộc bộ lọc này)
  const displayedKhoaList = useMemo(
    () =>
      filterKhoa === ""
        ? khoaList
        : khoaList.filter((k) => k.id === filterKhoa),
    [khoaList, filterKhoa],
  );

  const kpi = useMemo(() => {
    const daGui = [...weekMap.values()];
    const duSoLuong = daGui.filter((r) => r.so_luong_anh >= 3).length;
    const tot = daGui.filter(
      (r) =>
        (r.chat_luong || "").toLowerCase().includes("tốt") ||
        r.chat_luong === "tot",
    ).length;
    return {
      daGui: daGui.length,
      duSoLuong,
      chuaGui: khoaList.length - daGui.length,
      tot,
    };
  }, [weekMap, khoaList]);

  function openModal(khoaId?: number, existing?: Anh5sTuan) {
    setEditing(existing || null);
    setMKhoa(existing?.khoa_id ?? khoaId ?? "");
    setMTuan(existing?.tuan?.slice(0, 10) || activeTuan);
    setMSoAnh(existing?.so_luong_anh ?? 0);
    setMViTri(existing?.vi_tri?.map((v) => v.vitri_type_id) || []);
    setMChatLuong(existing?.chat_luong || "Tốt");
    setMGhiChu(existing?.ghi_chu || "");
    setModalError(null);
    setModalOpen(true);
  }

  async function save() {
    if (mKhoa === "") {
      setModalError("Cần chọn khoa");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      await createUpdateAnh5sTuan({
        ...(editing ? { id: editing.id } : {}),
        khoa_id: Number(mKhoa),
        tuan: mondayOf(new Date(mTuan)),
        so_luong_anh: mSoAnh,
        chat_luong: mChatLuong,
        ghi_chu: mGhiChu || undefined,
        vi_tri: mViTri,
      });
      setModalOpen(false);
      load();
      toast.success(editing ? "Đã lưu thay đổi ghi nhận ảnh!" : "Đã ghi nhận ảnh mới!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại";
      setModalError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function exportBaoCao(kind: "html" | "word") {
    setExporting(kind);
    setError(null);
    try {
      if (kind === "html") await exportBaoCaoZaloHTML(activeTuan);
      else await exportBaoCaoZaloWord(activeTuan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất báo cáo thất bại");
    } finally {
      setExporting(null);
    }
  }

  const [exportingExcel, setExportingExcel] = useState(false);

  // Xuất file Excel (.xlsx) thật thay vì CSV thô — CSV mở lên Excel bị dồn cột,
  // không set được độ rộng/tô màu nên nhìn rối; .xlsx cho phép định dạng cột,
  // in đậm + tô màu tiêu đề, căn giữa, đóng băng dòng đầu để dễ đọc khi cuộn.
  async function exportExcel() {
    setExportingExcel(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Tuần ${activeTuan}`.slice(0, 31));

      ws.columns = [
        { header: "STT", key: "stt", width: 7 },
        { header: "Khoa / Phòng", key: "khoa", width: 34 },
        { header: "Nhóm", key: "nhom", width: 15 },
        { header: "Trạng thái", key: "trangThai", width: 13 },
        { header: "Số ảnh", key: "soAnh", width: 9 },
        { header: "Vị trí đã gửi", key: "viTri", width: 42 },
        { header: "Chất lượng", key: "chatLuong", width: 14 },
        { header: "Ghi chú", key: "ghiChu", width: 32 },
      ];
      styleHeaderRow(ws.getRow(1));

      displayedKhoaList.forEach((k, idx) => {
        const r = weekMap.get(k.id);
        const row = ws.addRow({
          stt: idx + 1,
          khoa: k.ten_khoa,
          nhom: k.nhom,
          trangThai: r ? "Đã gửi" : "Chưa gửi",
          soAnh: r?.so_luong_anh ?? 0,
          viTri:
            r?.vi_tri
              ?.map((v) => v.vitri_type?.ten_vitri)
              .filter(Boolean)
              .join("; ") || "",
          chatLuong: r?.chat_luong || "",
          ghiChu: r?.ghi_chu || "",
        });
        styleDataRow(row, idx, ["stt", "trangThai", "soAnh", "chatLuong"]);
        row.getCell("trangThai").font = {
          bold: true,
          color: { argb: r ? "FF15803D" : "FFDC2626" },
        };
        if (r?.chat_luong) {
          const cl = r.chat_luong.toLowerCase();
          const color = cl.includes("tốt")
            ? "FF15803D"
            : cl.includes("trung")
              ? "FFB45309"
              : "FFDC2626";
          row.getCell("chatLuong").font = {
            bold: true,
            color: { argb: color },
          };
        }
      });

      ws.views = [{ state: "frozen", ySplit: 1 }];
      ws.autoFilter = { from: "A1", to: "H1" };

      await downloadWorkbook(wb, `zalo5s_tuan_${activeTuan}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất Excel thất bại");
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={<ImageIcon size={22} />}
        title="Nhóm Zalo 5S — Theo dõi gửi ảnh"
        subtitle="Ghi nhận khoa nào đã gửi ảnh lên nhóm Zalo 5S mỗi tuần — số lượng, vị trí, chất lượng"
        actions={
          <>
            <button
              className={btnSecondary}
              onClick={exportExcel}
              disabled={exportingExcel}
            >
              <Download size={15} />{" "}
              {exportingExcel ? "Đang xuất..." : "Xuất Excel"}
            </button>
            <button
              className={btnSecondary}
              onClick={() => exportBaoCao("html")}
              disabled={exporting !== null}
              title="Tải file HTML báo cáo — mở lên bấm nút '🖨 In / Lưu PDF' để in ra PDF"
            >
              <Printer size={15} />{" "}
              {exporting === "html" ? "Đang xuất..." : "Báo cáo HTML/PDF"}
            </button>
            <button
              className={btnSecondary}
              onClick={() => exportBaoCao("word")}
              disabled={exporting !== null}
              title="Tải file Word (.doc) báo cáo theo thể thức NĐ 30/2020/NĐ-CP"
            >
              <FileText size={15} />{" "}
              {exporting === "word" ? "Đang xuất..." : "Xuất Word"}
            </button>
            {!isViewOnly && (
              <button className={btnPrimary} onClick={() => openModal()}>
                <Plus size={16} /> Ghi nhận ảnh
              </button>
            )}
          </>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="📤 Đã gửi ảnh"
          value={`${kpi.daGui}/${khoaList.length}`}
          accent="navy"
        />
        <KpiCard
          label="✅ Đủ số lượng (≥3 ảnh)"
          value={kpi.duSoLuong}
          accent="green"
        />
        <KpiCard label="⏳ Chưa gửi" value={kpi.chuaGui} accent="red" />
        <KpiCard label="🏆 Chất lượng tốt" value={kpi.tot} accent="yellow" />
      </div>

      {/* ── Bộ lọc ── */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <Field label="Khoa / Phòng" className="min-w-[240px]">
          <SearchableSelect
            value={filterKhoa}
            onChange={setFilterKhoa}
            options={khoaList.map((k) => ({ value: k.id, label: k.ten_khoa }))}
            placeholder="— Tất cả khoa/phòng —"
          />
        </Field>

        <select
          className={inputCls}
          value={filterTuan}
          onChange={(e) => setFilterTuan(e.target.value)}
        >
          {tuanOptions.length === 0 && <option value="">Tuần này</option>}
          {tuanOptions.map((t) => (
            <option key={t} value={t}>
              Tuần {new Date(t).toLocaleDateString("vi-VN")}
            </option>
          ))}
        </select>
        {filterKhoa !== "" && (
          <button className={btnSecondary} onClick={() => setFilterKhoa("")}>
            <RotateCcw size={14} /> Xoá lọc
          </button>
        )}
      </div>

      {loading ? (
        <LoadingRow />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Bảng theo dõi tuần{" "}
              {new Date(activeTuan).toLocaleDateString("vi-VN")} —{" "}
              {filterKhoa === ""
                ? `toàn bộ ${khoaList.length} khoa/phòng/TT`
                : `${displayedKhoaList.length} khoa/phòng phù hợp`}
            </h3>
          </div>
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Khoa / Phòng / TT</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Số ảnh</th>
                  <th className="px-4 py-3 font-medium">Vị trí đã gửi</th>
                  <th className="px-4 py-3 font-medium">Chất lượng</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {displayedKhoaList.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-gray-400"
                    >
                      Không có khoa/phòng phù hợp với bộ lọc.
                    </td>
                  </tr>
                )}
                {displayedKhoaList.map((k, idx) => {
                  const r = weekMap.get(k.id);
                  return (
                    <tr
                      key={k.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-200">
                        {k.ten_khoa}
                      </td>
                      <td className="px-4 py-2.5">
                        {r ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            ✓ Đã gửi
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500 dark:bg-red-500/10 dark:text-red-400">
                            Chưa gửi
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                        {r ? (
                          <span
                            className={
                              r.so_luong_anh >= 3
                                ? ""
                                : "font-medium text-amber-600"
                            }
                          >
                            {r.so_luong_anh}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[260px] px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {r?.vi_tri?.map((v) => (
                            <span
                              key={v.id}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            >
                              {v.vitri_type?.ten_vitri?.replace(
                                /^\d+\.\s*/,
                                "",
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {r && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${clBadge(r.chat_luong)}`}
                          >
                            {r.chat_luong}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-2.5 text-xs text-gray-400">
                        {r?.ghi_chu}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!isViewOnly && (
                          <button
                            onClick={() => openModal(k.id, r)}
                            className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
                          >
                            {r ? "Sửa" : "Ghi nhận"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ghi nhận ── */}
      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật ghi nhận ảnh 5S" : "Ghi nhận ảnh 5S"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              className={btnSecondary}
              onClick={() => setModalOpen(false)}
            >
              Huỷ
            </button>
            <button className={btnPrimary} onClick={save} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Khoa / Phòng / TT">
            <SearchableSelect
              value={mKhoa}
              onChange={setMKhoa}
              options={khoaList.map((k) => ({
                value: k.id,
                label: k.ten_khoa,
              }))}
              placeholder="— Chọn khoa —"
            />
          </Field>
          <Field label="Tuần (tự quy về thứ 2 đầu tuần)">
            <input
              type="date"
              className={inputCls}
              value={mTuan}
              onChange={(e) => setMTuan(e.target.value)}
            />
          </Field>
          <Field label="Số ảnh đã gửi">
            <input
              type="number"
              min={0}
              max={50}
              className={inputCls}
              value={mSoAnh}
              onChange={(e) => setMSoAnh(Number(e.target.value))}
            />
          </Field>
          <Field label={`Vị trí đã gửi ảnh (${mViTri.length} đã chọn)`}>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
              {mConfigTypes.map((v) => {
                const on = mViTri.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      setMViTri((p) =>
                        on ? p.filter((x) => x !== v.id) : [...p, v.id],
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      on
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {v.ten_vitri}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Chất lượng ảnh">
            <select
              className={inputCls}
              value={mChatLuong}
              onChange={(e) => setMChatLuong(e.target.value)}
            >
              {CHAT_LUONG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ghi chú">
            <input
              className={inputCls}
              value={mGhiChu}
              onChange={(e) => setMGhiChu(e.target.value)}
              placeholder="VD: Thiếu ảnh tủ thuốc, ảnh buồng bệnh mờ..."
            />
          </Field>
          {modalError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              ✗ {modalError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
