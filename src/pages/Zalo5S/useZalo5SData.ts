// Toàn bộ state + dữ liệu tính toán của trang Nhóm Zalo 5S (bảng theo tuần,
// bộ lọc, modal ghi nhận, xuất Excel/HTML/Word) -- tách khỏi index.tsx để
// component container chỉ còn lo render.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCatalog } from "../../components/ui/PageShell";
import {
  createUpdateAnh5sTuan,
  exportBaoCaoZaloHTML,
  exportBaoCaoZaloWord,
  fetchAnh5sTuanList,
} from "../../features/qlcl/api";
import {
  ExcelJS,
  downloadWorkbook,
  styleDataRow,
  styleHeaderRow,
} from "../../features/qlcl/excelExport";
import type { Anh5sTuan } from "../../features/qlcl/types";
import { useKhoaViTri } from "../../features/qlcl/useKhoaViTri";
import { useIsViewOnly } from "../../features/auth/usePermission";
import { useToast } from "../../features/ui/useToast";
import { addDays, fmt, mondayOf, startOfWeek } from "./helpers";

export function useZalo5SData() {
  const isViewOnly = useIsViewOnly();
  const toast = useToast();
  const { khoaList } = useCatalog();
  const [records, setRecords] = useState<Anh5sTuan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [filterKhoa, setFilterKhoa] = useState<number | "">("");
  const [filterTrangThai, setFilterTrangThai] = useState<"" | "da-gui" | "chua-gui">("");
  const [filterChatLuong, setFilterChatLuong] = useState("");

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

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const activeTuan = useMemo(() => fmt(weekStart), [weekStart]);

  const weekMap = useMemo(() => {
    const map = new Map<number, Anh5sTuan>();
    for (const r of records) {
      if (r.tuan === activeTuan) map.set(r.khoa_id, r);
    }
    return map;
  }, [records, activeTuan]);

  // Danh sách khoa hiển thị trong bảng + xuất file — thu hẹp theo Khoa/Phòng +
  // Trạng thái (đã gửi/chưa gửi) + Chất lượng (chỉ áp dụng cho khoa đã gửi)
  const displayedKhoaList = useMemo(() => {
    let list =
      filterKhoa === "" ? khoaList : khoaList.filter((k) => k.id === filterKhoa);
    if (filterTrangThai || filterChatLuong) {
      list = list.filter((k) => {
        const r = weekMap.get(k.id);
        if (filterTrangThai === "da-gui" && !r) return false;
        if (filterTrangThai === "chua-gui" && r) return false;
        if (filterChatLuong && r?.chat_luong !== filterChatLuong) return false;
        return true;
      });
    }
    return list;
  }, [khoaList, filterKhoa, filterTrangThai, filterChatLuong, weekMap]);

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

  return {
    isViewOnly,
    khoaList,
    loading,
    error,
    load,
    weekStart,
    setWeekStart,
    weekEnd,
    activeTuan,
    weekMap,
    filterKhoa,
    setFilterKhoa,
    filterTrangThai,
    setFilterTrangThai,
    filterChatLuong,
    setFilterChatLuong,
    displayedKhoaList,
    kpi,
    modalOpen,
    setModalOpen,
    editing,
    mKhoa,
    setMKhoa,
    mConfigTypes,
    mTuan,
    setMTuan,
    mSoAnh,
    setMSoAnh,
    mViTri,
    setMViTri,
    mChatLuong,
    setMChatLuong,
    mGhiChu,
    setMGhiChu,
    saving,
    modalError,
    exporting,
    exportingExcel,
    openModal,
    save,
    exportBaoCao,
    exportExcel,
  };
}

export type Zalo5SData = ReturnType<typeof useZalo5SData>;
