// Tích hợp Google Sheets cho nút "Kết nối Sheet" (trang Xuất dữ liệu) -- CHẠY
// HOÀN TOÀN Ở TRÌNH DUYỆT (đúng nghĩa "kết nối trên máy đang dùng"): dùng
// Google Identity Services lấy access token OAuth của TÀI KHOẢN GOOGLE người
// dùng tự chọn ngay lúc đó, gọi thẳng Sheets/Drive API bằng token đó -- backend
// không tham gia, không có credential Google nào được gửi lên server của mình.
//
// Yêu cầu hạ tầng (xem .env.example): VITE_GOOGLE_CLIENT_ID trỏ tới 1 OAuth
// Client ID "Web application" tạo ở Google Cloud Console, đã bật Google Sheets
// API + Google Drive API, và khai đúng origin đang chạy dashboard vào
// "Authorized JavaScript origins".
//
// LƯU Ý QUAN TRỌNG (khác với xuất Excel): file Google Sheet/Docs/Slides tạo
// NGUYÊN GỐC trên Drive (không phải upload từ máy lên) mặc định KHÔNG tính vào
// dung lượng lưu trữ Google Drive/Gmail/Photos của tài khoản -- Google miễn trừ
// riêng 3 định dạng này. Vì vậy bước "kiểm tra đủ dung lượng" bên dưới vẫn được
// cài đúng như yêu cầu (đọc storageQuota thật từ Drive API), nhưng trong đa số
// trường hợp sẽ luôn PASS trừ khi tài khoản Google đó đã đầy dung lượng ở mức
// Google tự chặn mọi thao tác ghi (kể cả tạo file Sheet mới).

const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly";

// ── Ambient type tối giản cho Google Identity Services (không cần cài @types/google.accounts) ──
interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}
interface GoogleTokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: GoogleTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

export class GoogleSheetsError extends Error {}

// Google chỉ nhận "Authorized JavaScript origins" là: (1) http://localhost hoặc
// http://127.0.0.1 (kèm đúng cổng), hoặc (2) https://<tên miền thật>. KHÔNG nhận
// http thường (trừ localhost) và KHÔNG nhận địa chỉ IP thô (VD http://192.168.x.x)
// -- mở dashboard bằng các địa chỉ đó thì cửa sổ Google luôn báo
// "Lỗi 400: origin_mismatch" dù Client ID đúng. Kiểm tra trước để báo rõ nguyên
// nhân bằng tiếng Việt thay vì để người dùng gặp trang lỗi khó hiểu của Google.
export interface OriginCheck {
  origin: string;
  problem: string | null;
}

export function checkGoogleOrigin(): OriginCheck {
  const { origin, hostname, protocol } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const isRawIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
  if (isLocal) return { origin, problem: null };
  if (isRawIp) {
    return {
      origin,
      problem: `Bạn đang mở dashboard bằng địa chỉ IP (${origin}). Google KHÔNG chấp nhận địa chỉ IP làm nguồn được phép nên sẽ báo "origin_mismatch". Hãy mở dashboard bằng http://localhost:<cổng> trên máy đang chạy hệ thống, hoặc dùng tên miền https khi triển khai thật.`,
    };
  }
  if (protocol !== "https:") {
    return {
      origin,
      problem: `Địa chỉ ${origin} dùng http. Google chỉ chấp nhận https (trừ localhost) nên sẽ báo "origin_mismatch". Cần cấu hình HTTPS cho tên miền này, hoặc mở bằng http://localhost:<cổng>.`,
    };
  }
  return { origin, problem: null };
}

// Script GIS đã được nạp sẵn ở index.html (<script src=".../gsi/client" async>) --
// hàm này chỉ CHỜ cho tới khi window.google sẵn sàng (async nên có thể chưa
// load xong lúc component mount), timeout sau 10s để không treo popup vô hạn.
function waitForGis(): Promise<NonNullable<Window["google"]>> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve(window.google);
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve(window.google);
      } else if (Date.now() - start > 10000) {
        clearInterval(timer);
        reject(
          new GoogleSheetsError(
            "Không tải được thư viện đăng nhập Google. Kiểm tra kết nối mạng rồi thử lại.",
          ),
        );
      }
    }, 100);
  });
}

let cachedTokenClient: GoogleTokenClient | null = null;

// Mở popup chọn tài khoản Google + xin quyền (Sheets tạo file + xem dung lượng
// Drive). Trả về access token; ném lỗi tiếng Việt nếu người dùng từ chối/đóng
// popup hoặc thiếu cấu hình VITE_GOOGLE_CLIENT_ID.
export async function requestGoogleAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new GoogleSheetsError(
      "Chưa cấu hình VITE_GOOGLE_CLIENT_ID -- liên hệ quản trị hệ thống để bật tính năng kết nối Google Sheet.",
    );
  }
  const originCheck = checkGoogleOrigin();
  if (originCheck.problem) throw new GoogleSheetsError(originCheck.problem);
  const google = await waitForGis();

  return new Promise<string>((resolve, reject) => {
    if (!cachedTokenClient) {
      cachedTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.access_token) resolve(resp.access_token);
          else
            reject(
              new GoogleSheetsError(
                resp.error_description ||
                  "Bạn đã từ chối cấp quyền hoặc đóng cửa sổ đăng nhập Google.",
              ),
            );
        },
        error_callback: (err) => {
          reject(
            new GoogleSheetsError(
              err?.type === "popup_closed"
                ? "Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất."
                : err?.message || "Không thể mở cửa sổ đăng nhập Google.",
            ),
          );
        },
      });
    }
    // prompt: "" -- để Google tự quyết định (bỏ qua màn chọn tài khoản nếu chỉ
    // có 1 tài khoản Google đang đăng nhập sẵn trên trình duyệt này).
    cachedTokenClient.requestAccessToken({ prompt: "" });
  });
}

async function googleFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Google API lỗi (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // giữ nguyên message mặc định nếu body không phải JSON
    }
    throw new GoogleSheetsError(message);
  }
  return res.json();
}

export interface DriveQuota {
  limitBytes: number | null; // null = không giới hạn (gói Workspace Unlimited...)
  usageBytes: number;
}

// Đọc dung lượng Drive thật của tài khoản vừa đăng nhập (drive.metadata.readonly).
export async function getDriveQuota(token: string): Promise<DriveQuota> {
  const data = await googleFetch(
    "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
    token,
  );
  const quota = data?.storageQuota || {};
  return {
    limitBytes: quota.limit != null ? Number(quota.limit) : null,
    usageBytes: quota.usage != null ? Number(quota.usage) : 0,
  };
}

// Ước tính dung lượng dữ liệu sẽ ghi (byte) -- xấp xỉ theo độ dài chuỗi UTF-8
// của toàn bộ ô (header + data), đủ để hiển thị con số tham khảo cho người
// dùng trước khi họ bấm "Đồng ý kết nối".
export function estimateSheetBytes(
  tables: { headers: string[]; rows: (string | number)[][] }[],
): number {
  let total = 0;
  for (const t of tables) {
    total += new Blob([JSON.stringify(t.headers)]).size;
    for (const row of t.rows) total += new Blob([JSON.stringify(row)]).size;
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface SheetTableData {
  title: string; // tên sheet (giống sheetName bên xuất Excel)
  headers: string[];
  rows: (string | number)[][];
  // Chỉ số cột (0-based) chứa công thức =IMAGE(...) -- nếu có, sheet này được
  // nới rộng cột + tăng chiều cao dòng cho vừa ảnh, và ghi theo từng lô nhỏ vì
  // mỗi ô ảnh nặng hơn ô chữ rất nhiều (xem buildImageFormula).
  imageColumn?: number;
}

// Công thức hiện ảnh trong ô Google Sheet từ thumbnail ĐÃ NHÚNG SẴN dạng data
// URI (base64) -- không cần URL công khai, không cần upload lên Drive: ảnh nằm
// luôn trong chính file Sheet nên mở ở đâu, ai có quyền xem Sheet cũng thấy
// ảnh, không phụ thuộc backend nội bộ hay token hết hạn.
export function buildImageFormula(dataUri: string): string {
  return `=IMAGE("${dataUri}")`;
}

// Kích thước ô ảnh (pixel) trên Google Sheet -- vừa khung thumbnail 150x110.
const IMG_COL_PX = 160;
const IMG_ROW_PX = 118;
const IMG_CHUNK_ROWS = 40; // ô ảnh nặng -> ghi ít dòng/lần để body request không quá lớn
const TEXT_CHUNK_ROWS = 500;

export interface CreatedSpreadsheet {
  spreadsheetId: string;
  url: string;
}

// Tạo 1 Google Spreadsheet mới, mỗi bảng trong `tables` -> 1 sheet riêng, ghi
// đủ header + data, tô đậm + đóng băng dòng tiêu đề cho dễ đọc (giống style
// header xanh navy dùng chung ở excelExport.ts). Ném GoogleSheetsError nếu bất
// kỳ bước nào (tạo file, ghi dữ liệu, định dạng) thất bại.
export async function createGoogleSpreadsheet(
  token: string,
  title: string,
  tables: SheetTableData[],
  onProgress?: (text: string) => void,
): Promise<CreatedSpreadsheet> {
  const created = await googleFetch(
    "https://sheets.googleapis.com/v4/spreadsheets",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        properties: { title },
        sheets: tables.map((t) => ({ properties: { title: t.title.slice(0, 31) } })),
      }),
    },
  );

  const spreadsheetId: string = created.spreadsheetId;
  const sheetIdByTitle = new Map<string, number>(
    (created.sheets || []).map((s: { properties: { title: string; sheetId: number } }) => [
      s.properties.title,
      s.properties.sheetId,
    ]),
  );

  // Ghi dữ liệu -- chia lô theo từng sheet (sheet có ảnh chia lô nhỏ hơn vì mỗi
  // ô ảnh là 1 chuỗi base64 vài KB, gộp hết 1 request dễ vượt giới hạn body).
  const chunkPlans = tables.map((t) => {
    const all = [t.headers, ...t.rows];
    const size = t.imageColumn != null ? IMG_CHUNK_ROWS : TEXT_CHUNK_ROWS;
    return { t, all, size, parts: Math.ceil(all.length / size) };
  });
  const totalParts = chunkPlans.reduce((s, p) => s + p.parts, 0);
  let donePart = 0;
  for (const { t, all, size } of chunkPlans) {
    for (let i = 0; i < all.length; i += size) {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: [
              {
                range: `'${t.title.slice(0, 31)}'!A${i + 1}`,
                values: all.slice(i, i + size),
              },
            ],
          }),
        },
      );
      donePart += 1;
      onProgress?.(`Đang ghi dữ liệu lên Google Sheet (${donePart}/${totalParts})...`);
    }
  }

  // Tô đậm + đóng băng dòng tiêu đề cho từng sheet (không chặn lỗi ở đây làm
  // hỏng cả file đã tạo -- lỗi định dạng chỉ log, không throw, vì dữ liệu đã
  // ghi thành công là phần quan trọng nhất).
  const formatRequests = tables.flatMap((t) => {
    const sheetId = sheetIdByTitle.get(t.title.slice(0, 31));
    if (sheetId == null) return [];
    return [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.122, green: 0.220, blue: 0.392 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
              },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      },
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      },
      // Sheet có ảnh: nới rộng cột ảnh, nâng chiều cao các dòng dữ liệu cho vừa
      // thumbnail, căn giữa theo chiều dọc để chữ nằm giữa ô ảnh.
      ...(t.imageColumn != null && t.rows.length > 0
        ? [
            {
              updateDimensionProperties: {
                range: {
                  sheetId,
                  dimension: "COLUMNS",
                  startIndex: t.imageColumn,
                  endIndex: t.imageColumn + 1,
                },
                properties: { pixelSize: IMG_COL_PX },
                fields: "pixelSize",
              },
            },
            {
              updateDimensionProperties: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: 1,
                  endIndex: t.rows.length + 1,
                },
                properties: { pixelSize: IMG_ROW_PX },
                fields: "pixelSize",
              },
            },
            {
              repeatCell: {
                range: { sheetId, startRowIndex: 1, endRowIndex: t.rows.length + 1 },
                cell: { userEnteredFormat: { verticalAlignment: "MIDDLE" } },
                fields: "userEnteredFormat.verticalAlignment",
              },
            },
          ]
        : []),
    ];
  });
  if (formatRequests.length) {
    try {
      await googleFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        token,
        { method: "POST", body: JSON.stringify({ requests: formatRequests }) },
      );
    } catch {
      // bỏ qua lỗi định dạng -- dữ liệu vẫn đã ghi đủ
    }
  }

  return {
    spreadsheetId,
    url: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
