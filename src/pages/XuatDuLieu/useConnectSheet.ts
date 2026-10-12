// State + logic cho popup "Kết nối Sheet" -- ước tính dung lượng trước, hỏi
// xác nhận, rồi mới xin quyền Google + kiểm tra dung lượng Drive + tạo file.
// Xem features/qlcl/googleSheets.ts để biết chi tiết gọi Google API.
//
// Ảnh trong sheet "Ảnh 5S": Google Sheet KHÔNG hiển thị được ảnh nhúng dạng
// data URI (báo #VALUE!) nên ảnh thu nhỏ được TẢI LÊN GOOGLE DRIVE của chính
// người kết nối (thư mục riêng, để riêng tư), rồi ô ảnh dùng công thức =IMAGE()
// trỏ tới file đó (xem buildImageFormula).
import { useCallback, useState } from "react";
import type { AnhMode, BangKey } from "./types";
import { SHEET_EMBED_MAX } from "./constants";
import { fmtDateVN } from "./helpers";
import { buildExportBaseName, fetchSelectedBangRows } from "./dataFetch";
import { fetchThumbsForRows, type EmbeddedThumb } from "./imageEmbed";
import {
  buildImageFormula,
  createDriveFolder,
  createGoogleSpreadsheet,
  estimateSheetBytes,
  formatBytes,
  getDriveQuota,
  moveDriveFileToFolder,
  requestGoogleAccessToken,
  uploadThumbsToDrive,
  type SheetTableData,
} from "../../features/qlcl/googleSheets";

export type ConnectSheetStep =
  | "estimating" // vừa mở popup, đang tải dữ liệu để tính dung lượng
  | "confirm" // đã có ước tính, chờ người dùng bấm "Đồng ý kết nối"
  | "connecting" // đang mở popup đăng nhập Google
  | "checking-quota" // đang đọc dung lượng Google Drive
  | "uploading-images" // đang tải ảnh thu nhỏ lên Google Drive
  | "creating" // đang tạo + ghi dữ liệu vào Google Sheet
  | "success"
  | "error";

export interface SheetEstimate {
  totalRows: number;
  totalSheets: number;
  bytes: number; // tổng dung lượng sẽ ghi (chữ + ảnh) -- dùng so với dung lượng Drive còn trống
  imageCount: number; // số ảnh thu nhỏ sẽ tải lên Drive (0 nếu không nhúng ảnh)
  imageBytes: number;
}

// Ảnh của 1 sheet chờ tải lên Drive: thumbs[i] ứng với rows[i] của sheet đó.
interface PendingImages {
  tableIndex: number;
  imageColumn: number;
  names: string[];
  thumbs: (EmbeddedThumb | null)[];
}

export function useConnectSheet() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ConnectSheetStep>("estimating");
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<SheetEstimate | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [tables, setTables] = useState<SheetTableData[] | null>(null);
  const [pending, setPending] = useState<PendingImages | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  // Chữ tiến độ phụ (VD "Đang tải ảnh 12/32...") hiện dưới tiêu đề bước hiện tại
  const [progressText, setProgressText] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Ghi chú sau khi tạo xong (VD "2 ảnh không tải lên được...")
  const [resultNote, setResultNote] = useState<string | null>(null);

  const openModal = useCallback(
    async (selected: Set<BangKey>, tuNgay: string, denNgay: string, anhMode: AnhMode) => {
      setOpen(true);
      setStep("estimating");
      setError(null);
      setResultUrl(null);
      setResultNote(null);
      setTables(null);
      setPending(null);
      setProgressText(null);
      setNotice(null);
      try {
        const fetched = await fetchSelectedBangRows(selected, tuNgay, denNgay);
        const builtTables: SheetTableData[] = [];
        let pendingImages: PendingImages | null = null;

        for (const { bang, rows } of fetched) {
          // Mỗi ảnh = 1 lần tải lên Drive nên chỉ nhúng khi số lượng nhỏ; nhiều
          // hơn thì chỉ ghi dữ liệu chữ và báo người dùng (dùng ZIP / Excel).
          const tooMany = bang.key === "anh-5s" && anhMode === "thumb" && rows.length > SHEET_EMBED_MAX;
          if (tooMany) {
            setNotice(
              `Bảng Ảnh 5S có ${rows.length.toLocaleString("vi-VN")} ảnh (vượt ${SHEET_EMBED_MAX}) nên Google Sheet chỉ ghi dữ liệu chữ, không đưa ảnh vào. Để lấy ảnh hãy dùng nút "Tải ZIP ảnh" hoặc xuất Excel.`,
            );
          }
          const withImages = bang.key === "anh-5s" && anhMode === "thumb" && !tooMany && rows.length > 0;

          // Tải ảnh thu nhỏ từ backend NGAY LÚC TÍNH ƯỚC LƯỢNG để con số dung lượng
          // trong popup tính đúng cả phần ảnh sẽ lưu lên Drive.
          const thumbs = withImages
            ? await fetchThumbsForRows(rows, (done, total) =>
                setProgressText(`Đang tải ảnh minh chứng ${done}/${total}...`),
              )
            : [];

          if (withImages) {
            pendingImages = {
              tableIndex: builtTables.length,
              imageColumn: 1,
              names: rows.map((r) => {
                const zipPath = String(r.zip_path || "");
                const base = zipPath.split("/").pop() || `anh_${r.id}.jpg`;
                return `thumb_${base.replace(/\.[^.]+$/, "")}.jpg`;
              }),
              thumbs,
            };
          }

          builtTables.push({
            title: bang.sheetName,
            headers: [
              "STT",
              ...(withImages ? ["Ảnh"] : []),
              ...bang.columns.map((c) => c.header),
            ],
            imageColumn: withImages ? 1 : undefined,
            rows: rows.map((r, idx) => [
              idx + 1,
              // Ô ảnh điền sau khi tải ảnh lên Drive xong (cần id file Drive)
              ...(withImages ? [thumbs[idx] ? "" : "Không tải được ảnh"] : []),
              ...bang.columns.map((c) => {
                const raw = r[c.key];
                if (c.isDate) return fmtDateVN(raw as string);
                return (raw ?? "") as string | number;
              }),
            ]),
          });
        }
        setProgressText(null);

        const imageBytes = pendingImages
          ? pendingImages.thumbs.reduce((s, t) => s + (t ? t.blob.size : 0), 0)
          : 0;
        const imageCount = pendingImages ? pendingImages.thumbs.filter(Boolean).length : 0;

        setTables(builtTables);
        setPending(pendingImages);
        setFileTitle(
          buildExportBaseName(
            fetched.map((f) => f.bang),
            tuNgay,
            denNgay,
          ),
        );
        setEstimate({
          totalRows: builtTables.reduce((s, t) => s + t.rows.length, 0),
          totalSheets: builtTables.length,
          bytes: estimateSheetBytes(builtTables) + imageBytes,
          imageCount,
          imageBytes,
        });
        setStep("confirm");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không lấy được dữ liệu để ước tính dung lượng.",
        );
        setStep("error");
      }
    },
    [],
  );

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  // Bước thực sự kết nối -- có thể gọi lại nhiều lần (nút "Thử lại" khi step
  // === "error") vì tables/estimate đã được giữ sẵn từ lúc mở popup, không cần
  // fetch lại dữ liệu.
  const connect = useCallback(async () => {
    if (!tables || !estimate) return;
    setError(null);
    setResultNote(null);
    try {
      setStep("connecting");
      const token = await requestGoogleAccessToken();

      setStep("checking-quota");
      const quota = await getDriveQuota(token);
      if (quota.limitBytes != null) {
        const remaining = quota.limitBytes - quota.usageBytes;
        if (remaining < estimate.bytes) {
          setError(
            `Không đủ dung lượng lưu trữ trên Google Drive của bạn (còn trống ~${formatBytes(
              Math.max(remaining, 0),
            )}, cần khoảng ~${formatBytes(estimate.bytes)}).`,
          );
          setStep("error");
          return;
        }
      }

      // Tải ảnh thu nhỏ lên thư mục Drive riêng (cùng thư mục với file Sheet)
      let finalTables = tables;
      let folderId: string | null = null;
      let note: string | null = null;
      if (pending) {
        setStep("uploading-images");
        setProgressText(`Đang lưu ảnh lên Google Drive 0/${pending.thumbs.length}...`);
        folderId = await createDriveFolder(token, fileTitle);
        const up = await uploadThumbsToDrive(
          token,
          folderId,
          pending.names.map((name, i) => ({ name, blob: pending.thumbs[i]?.blob ?? null })),
          (done, total) => setProgressText(`Đang lưu ảnh lên Google Drive ${done}/${total}...`),
        );
        finalTables = tables.map((t, ti) =>
          ti !== pending.tableIndex
            ? t
            : {
                ...t,
                rows: t.rows.map((row, ri) => {
                  const id = up.ids[ri];
                  const next = row.slice();
                  next[pending.imageColumn] = id ? buildImageFormula(id) : "Không tải được ảnh";
                  return next;
                }),
              },
        );
        if (up.failed > 0) {
          note = `${up.failed} ảnh không đưa lên được Drive${up.firstError ? ` (${up.firstError})` : ""} — ô tương ứng ghi "Không tải được ảnh".`;
        }
      }

      setStep("creating");
      setProgressText(null);
      const created = await createGoogleSpreadsheet(token, fileTitle, finalTables, setProgressText);
      if (folderId) await moveDriveFileToFolder(token, created.spreadsheetId, folderId);
      setProgressText(null);
      setResultNote(note);
      setResultUrl(created.url);
      setStep("success");
      window.open(created.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kết nối Google Sheet thất bại.");
      setStep("error");
    }
  }, [tables, estimate, pending, fileTitle]);

  return {
    open,
    step,
    error,
    estimate,
    resultUrl,
    fileTitle,
    progressText,
    notice,
    resultNote,
    hasImages: !!pending,
    openModal,
    closeModal,
    connect,
  };
}

export type ConnectSheetData = ReturnType<typeof useConnectSheet>;
