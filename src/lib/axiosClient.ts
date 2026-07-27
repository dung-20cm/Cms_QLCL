import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getToken, clearToken } from "../features/auth/tokenStorage";
import { dispatchAuthExpired } from "../features/auth/authEvents";

// Backend (D:\My-project\Hospital\hospital_server) không dùng chuẩn HTTP status cho lỗi nghiệp vụ:
// - config/handle_response.js `Response()`: thành công trả {statusCode:200, message, data},
//   lỗi trả {statusCode:400, message} nhưng KHÔNG phải lúc nào cũng set HTTP status 400
//   (tuỳ nhánh code có gọi res.status(400) trước khi throw hay không) => phải tự kiểm tra body.
// - middleware/auth.js (`isAuthAdmin`, `check_permission`): trả {signal:0, code, message}
//   khi token thiếu/hết hạn/không có quyền, HTTP status luôn 200.
interface BackendEnvelope<T = unknown> {
  statusCode?: number;
  message?: string;
  data?: T;
  signal?: number;
  code?: number;
  errorCode?: string;
}

// code phiên đăng nhập không hợp lệ do middleware auth.js trả về => tự động logout
const SESSION_INVALID_CODES = new Set([401, 402, 403, 405]);

export class ApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// Mặc định lấy đúng HOST đang mở trang trên trình duyệt (localhost, IP LAN máy
// thật, IP máy ảo...) rồi ghép cổng 8080 -- áp dụng được cho MỌI máy/IP truy
// cập mà không cần sửa tay .env mỗi khi đổi máy chạy. VITE_API_BASE_URL trong
// .env (nếu có set) vẫn được ưu tiên trước, dùng khi backend nằm khác host
// với frontend.
const defaultApiBase =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: defaultApiBase || import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.set("token", token);
  }
  return config;
});

function handleSessionInvalid(code?: number) {
  if (code !== undefined && SESSION_INVALID_CODES.has(code)) {
    clearToken();
    dispatchAuthExpired();
  }
}

apiClient.interceptors.response.use(
  (response) => {
    const body = response.data as BackendEnvelope;

    // Lỗi kiểu middleware auth.js: {signal: 0, code, message}
    if (body && typeof body === "object" && body.signal === 0) {
      handleSessionInvalid(body.code);
      return Promise.reject(
        new ApiError(body.message || "Có lỗi xảy ra!", body.code),
      );
    }

    // Lỗi kiểu Response() wrapper: {statusCode: 400, message}
    if (
      body &&
      typeof body === "object" &&
      typeof body.statusCode === "number" &&
      body.statusCode !== 200
    ) {
      handleSessionInvalid(body.code);
      return Promise.reject(
        new ApiError(body.message || "Có lỗi xảy ra!", body.code),
      );
    }

    return response;
  },
  (error: AxiosError<BackendEnvelope>) => {
    const body = error.response?.data;
    const message =
      body?.message || error.message || "Có lỗi xảy ra, vui lòng thử lại!";
    handleSessionInvalid(body?.code);
    return Promise.reject(new ApiError(message, body?.code));
  },
);
