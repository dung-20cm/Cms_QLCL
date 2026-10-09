/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // OAuth Client ID tạo ở Google Cloud Console (APIs & Services > Credentials)
  // -- dùng cho nút "Kết nối Sheet" ở trang Xuất dữ liệu (features/qlcl/googleSheets.ts).
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
