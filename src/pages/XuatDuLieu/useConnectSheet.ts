// State + logic cho popup "Kết nối Sheet" -- ước tính dung lượng trước, hỏi
// xác nhận, rồi mới xin quyền Google + kiểm tra dung lượng Drive + tạo file.
// Xem services/qlcl/googleSheets.ts để biết chi tiết gọi Google API.
import { useCallback, useState } from "react";
import type { BangKey } from "./types";
import { fmtDateVN } from "./helpers";
import { buildExportBaseName, fetchSelectedBangRows } from "./dataFetch";
import { fetchThumbsForRows } from "./imageEmbed";
import {
  buildImageFormula,
  createGoogleSpreadsheet,
  estimateSheetBytes,
  formatBytes,
  getDriveQuota,
  requestGoogleAccessToken,
  type SheetTableData,
} from "../../features/qlcl/googleSheets";

export type ConnectSheetStep =
  | "estimating" // vừa mở popup, đang tải dữ liệu để tính dung lượng
  | "confirm" // đã có ước tính, chờ người dùng bấm "Đồng ý kết nối"
  | "connecting" // đang mở popup đăng nhập Google
  | "checking-quota" // đang đọc dung lượng Google Drive
  | "creating" // đang tạo + ghi dữ liệu vào Google Sheet
  | "success"
  | "error";

export interface SheetEstimate {
  totalRows: number;
  totalSheets: number;
  bytes: number;
}

export function useConnectSheet() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ConnectSheetStep>("estimating");
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<SheetEstimate | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [tables, setTables] = useState<SheetTableData[] | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  // Chữ tiến độ phụ (VD "Đang tải ảnh 12/32...") hiện dưới tiêu đề bước hiện tại
  const [progressText, setProgressText] = useState<string | null>(null);

  const openModal = useCallback(
    async (selected: Set<BangKey>, tuNgay: string, denNgay: string) => {
      setOpen(true);
      setStep("estimating");
      setError(null);
      setResultUrl(null);
      setTables(null);
      setProgressText(null);
      try {
        const fetched = await fetchSelectedBangRows(selected, tuNgay, denNgay);
        const builtTables: SheetTableData[] = [];
        for (const { bang, rows } of fetched) {
          const isAnh5S = bang.key === "anh-5s";
          // Sheet "Ảnh 5S": tải thumbnail thật của từng ảnh NGAY LÚC TÍNH ƯỚC
          // LƯỢNG (để con số dung lượng trong popup phản ánh đúng cả ảnh) -- ảnh
          // được nhúng thẳng vào ô bằng =IMAGE("data:...") nên không cần upload
          // lên Drive hay chia sẻ công khai gì cả.
          const thumbs = isAnh5S
            ? await fetchThumbsForRows(rows, (done, total) =>
                setProgressText(`Đang tải ảnh minh chứng ${done}/${total}...`),
              )
            : [];
          builtTables.push({
            title: bang.sheetName,
            headers: [
              "STT",
              ...(isAnh5S ? ["Ảnh"] : []),
              ...bang.columns.map((c) => c.header),
            ],
            imageColumn: isAnh5S ? 1 : undefined,
            rows: rows.map((r, idx) => {
              const thumb = thumbs[idx];
              return [
              idx + 1,
              ...(isAnh5S
                ? [thumb ? buildImageFormula(thumb.base64) : "Không tải được ảnh"]
                : []),
              ...bang.columns.map((c) => {
                const raw = r[c.key];
                if (c.isDate) return fmtDateVN(raw as string);
                return (raw ?? "") as string | number;
              }),
              ];
            }),
          });
        }
        setProgressText(null);

        setTables(builtTables);
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
          bytes: estimateSheetBytes(builtTables),
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

      setStep("creating");
      setProgressText(null);
      const created = await createGoogleSpreadsheet(token, fileTitle, tables, setProgressText);
      setProgressText(null);
      setResultUrl(created.url);
      setStep("success");
      window.open(created.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kết nối Google Sheet thất bại.");
      setStep("error");
    }
  }, [tables, estimate, fileTitle]);

  return {
    open,
    step,
    error,
    estimate,
    resultUrl,
    fileTitle,
    progressText,
    openModal,
    closeModal,
    connect,
  };
}

export type ConnectSheetData = ReturnType<typeof useConnectSheet>;
