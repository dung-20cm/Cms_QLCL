// State + logic trang "Xuất dữ liệu" (CHỈ Admin): chọn khoảng ngày, chọn 1
// hoặc nhiều bảng dữ liệu, xuất TẤT CẢ bảng đã chọn vào 1 file Excel — mỗi
// bảng 1 sheet riêng, style dùng chung với Zalo5S/Tổng hợp (features/qlcl/excelExport.ts).
// Riêng sheet "Ảnh 5S": nhúng thẳng ảnh minh chứng thật (thumbnail) vào cột
// đầu tiên -- cùng kỹ thuật lấy ảnh đã dùng ở features/qlcl/exportAnh5SPpt.ts,
// xem imageEmbed.ts để biết chi tiết tải + resize ảnh.
import { useCallback, useState } from "react";
import {
  ExcelJS,
  downloadWorkbook,
  styleDataRow,
  styleHeaderRow,
} from "../../features/qlcl/excelExport";
import { BANG_LIST } from "./constants";
import type { BangColumn, BangKey } from "./types";
import { fmtDateVN } from "./helpers";
import { buildExportBaseName, fetchSelectedBangRows } from "./dataFetch";
import { fetchPhotoThumbnail, mapWithConcurrency, type EmbeddedThumb } from "./imageEmbed";

const ANH_COL_KEY = "__anh";
const ANH_COL_WIDTH = 22; // ~150px, vừa khung thumbnail
const ANH_ROW_HEIGHT = 85; // points (~113px) -- vừa chiều cao thumbnail tối đa 110px

export function useXuatDuLieuData() {
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [selected, setSelected] = useState<Set<BangKey>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggleBang = useCallback((key: BangKey) => {
    setDone(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setDone(false);
    setSelected(new Set(BANG_LIST.map((b) => b.key)));
  }, []);

  const clearAll = useCallback(() => {
    setDone(false);
    setSelected(new Set());
  }, []);

  const resetFilters = useCallback(() => {
    setTuNgay("");
    setDenNgay("");
  }, []);

  function buildRowValue(column: BangColumn, raw: unknown) {
    if (column.isDate) return fmtDateVN(raw as string);
    return raw ?? "";
  }

  const handleExport = useCallback(async () => {
    if (selected.size === 0) return;
    setExporting(true);
    setExportProgress(null);
    setError(null);
    setDone(false);
    try {
      const wb = new ExcelJS.Workbook();
      const fetched = await fetchSelectedBangRows(selected, tuNgay, denNgay);

      for (const { bang, rows } of fetched) {
        const isAnh5S = bang.key === "anh-5s";
        const ws = wb.addWorksheet(bang.sheetName.slice(0, 31));
        const centerKeys = bang.columns
          .filter((c) => c.align === "center")
          .map((c) => c.key);
        centerKeys.push("stt");

        ws.columns = [
          { header: "STT", key: "stt", width: 7 },
          ...(isAnh5S ? [{ header: "Ảnh", key: ANH_COL_KEY, width: ANH_COL_WIDTH }] : []),
          ...bang.columns.map((c) => ({ header: c.header, key: c.key, width: c.width })),
        ];
        styleHeaderRow(ws.getRow(1));

        // Tải sẵn thumbnail của TẤT CẢ ảnh trong sheet trước khi addRow (cần
        // biết kích thước ảnh để neo đúng vị trí) -- tối đa 4 ảnh tải song
        // song 1 lúc, có báo tiến độ vì có thể mất vài chục giây với nhiều ảnh.
        let thumbs: (EmbeddedThumb | null)[] = [];
        if (isAnh5S) {
          thumbs = await mapWithConcurrency(
            rows,
            4,
            (r) => {
              const id = r.id != null ? Number(r.id) : NaN;
              return Number.isFinite(id) && id > 0
                ? fetchPhotoThumbnail(id)
                : Promise.resolve(null);
            },
            (doneCount, total) =>
              setExportProgress(`Đang tải ảnh minh chứng ${doneCount}/${total}...`),
          );
          setExportProgress("Đang dựng file Excel...");
        }

        rows.forEach((r, idx) => {
          const rowData: Record<string, unknown> = { stt: idx + 1 };
          if (isAnh5S) rowData[ANH_COL_KEY] = "";
          bang.columns.forEach((c) => {
            rowData[c.key] = buildRowValue(c, r[c.key]);
          });
          const row = ws.addRow(rowData);
          styleDataRow(row, idx, centerKeys);

          if (isAnh5S) {
            row.height = ANH_ROW_HEIGHT;
            const thumb = thumbs[idx];
            if (thumb) {
              const imageId = wb.addImage({ base64: thumb.base64, extension: "jpeg" });
              ws.addImage(imageId, {
                // Cột B (index 1, ngay sau STT) -- dòng data: header chiếm
                // row index 0 nên dòng dữ liệu thứ idx nằm ở index idx + 1.
                tl: { col: 1, row: idx + 1 },
                ext: { width: thumb.width, height: thumb.height },
              });
            } else {
              row.getCell(ANH_COL_KEY).value = "Không tải được ảnh";
            }
          }
        });

        ws.views = [{ state: "frozen", ySplit: 1 }];
        // STT + (cột Ảnh nếu có) + các cột dữ liệu của bảng.
        const extraCols = 1 + (isAnh5S ? 1 : 0);
        const lastCol = String.fromCharCode(64 + bang.columns.length + extraCols);
        ws.autoFilter = { from: "A1", to: `${lastCol}1` };
      }

      setExportProgress(null);
      const baseName = buildExportBaseName(
        fetched.map((f) => f.bang),
        tuNgay,
        denNgay,
      );
      await downloadWorkbook(wb, `${baseName}.xlsx`);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất dữ liệu thất bại");
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }, [selected, tuNgay, denNgay]);

  return {
    tuNgay,
    setTuNgay,
    denNgay,
    setDenNgay,
    selected,
    toggleBang,
    selectAll,
    clearAll,
    resetFilters,
    exporting,
    exportProgress,
    error,
    done,
    handleExport,
  };
}

export type XuatDuLieuData = ReturnType<typeof useXuatDuLieuData>;
