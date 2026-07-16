# CLAUDE.md

File này hướng dẫn Claude khi làm việc trong repo này.

> **Lưu ý:** bản trước của file này mô tả kiến trúc cũ — một SPA HTML/CSS/JS thuần không build (`login.html` + `5S_Dashboard_BVTB.html`, ~4000 dòng 1 file). Kiến trúc đó **đã được thay thế** bằng ứng dụng React dưới đây. Các file `5S_Dashboard_BVTB_v4.html` v.v. còn sót lại trong repo chỉ là bản phân tích chức năng gốc / tài liệu tham khảo khi thiết kế, **không phải app đang chạy**.

## Tổng quan dự án

Frontend (React SPA) cho Dashboard điện tử quản lý chất lượng 5S — Bệnh viện Đa khoa Thái Bình, Phòng Quản lý Chất lượng. Gọi API tới backend `server_qlcl` (Node.js/Express/Sequelize, xem `../server_qlcl`).

## Stack

- React 19 + TypeScript + Vite 8, không dùng React Compiler
- Redux Toolkit + react-redux (state toàn cục)
- React Router v7 (`BrowserRouter`)
- Tailwind CSS v4 (qua `@tailwindcss/vite`, không cần `tailwind.config` truyền thống)
- Axios (`axiosClient`) cho gọi API
- ApexCharts (`react-apexcharts`) cho biểu đồ
- pptxgenjs — xuất báo cáo ảnh 5S ra PowerPoint
- lucide-react — icon
- Lint: `oxlint` (không phải ESLint)

## Lệnh chạy

```
npm install
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint       # oxlint
npm run preview
```

Backend cần chạy song song: `cd ../server_qlcl && npm run dev` (mặc định port 8080). Frontend gọi qua biến môi trường `VITE_API_BASE_URL` (fallback `http://localhost:8080` nếu không set — xem `src/lib/axiosClient.ts`).

## Cấu trúc thư mục (`src/`)

| Thư mục | Nội dung |
|---|---|
| `app/` | `store.ts` (Redux store: `ui`, `theme`, `auth`, `catalog`), `hooks.ts` (`useAppDispatch`/`useAppSelector` có type) |
| `features/auth/` | `authSlice.ts` (login, restore session), `authTypes.ts`, `permissions.ts` (danh sách permission slug + nhóm quyền), `usePermission.ts`, `tokenStorage.ts`, `authEvents.ts` |
| `features/qlcl/` | `api.ts` (toàn bộ lời gọi API nghiệp vụ), `catalogSlice.ts` (cache khoa/vị trí/user), `types.ts`, `useKhoaViTri.ts`, `exportAnh5SPpt.ts` |
| `features/theme/`, `features/ui/` | Dark mode, trạng thái UI (sidebar mở/đóng...) |
| `lib/axiosClient.ts` | Instance axios + interceptor xử lý lỗi/hết phiên |
| `components/auth/` | `ProtectedRoute`, `GuestRoute`, `RequirePermission`, `AuthLoadingScreen`, `AuthExpiredListener` |
| `components/layout/` | `AppLayout`, `Header`, `Sidebar` |
| `components/charts/` | `TrendChart`, `TargetChart`, `GroupBreakdownChart` (ApexCharts) |
| `components/ui/` | `PageShell`, `StatCard`, `ChartCard`, `SearchableSelect` |
| `pages/` | Mỗi route nghiệp vụ 1 file (xem bảng route bên dưới), `pages/cauhinh/` chứa 4 trang con Cấu hình |

## Routing & phân quyền (`App.tsx`)

- `GuestRoute` bọc `/login` (đã đăng nhập thì không vào lại được).
- `ProtectedRoute` bọc toàn bộ route còn lại, tự redirect `/login` nếu chưa đăng nhập, hiện `AuthLoadingScreen` khi đang xác thực token cũ.
- Mỗi route nghiệp vụ bọc thêm `RequirePermission slug={...}` — ẩn nội dung (không phải ẩn menu) nếu user thiếu quyền.
- `/` (Home) tự route theo quyền: có quyền xem tổng hợp → `Dashboard`, chỉ có quyền làm đánh giá (Nhân viên) → redirect `/bang-kiem`.

| Route | Trang | Quyền yêu cầu (nhóm) |
|---|---|---|
| `/` | Dashboard (Analytics) | `PERM_XEM_TONG_HOP` |
| `/bang-kiem` | BangKiem | `PERM_DANH_GIA` |
| `/lich-danh-gia` | LichDanhGia | `PERM_XEM_LICH` |
| `/zalo-5s` | Zalo5S | `PERM_XEM_ANH_5S` |
| `/anh-5s` | Anh5S | `PERM_XEM_ANH_5S` |
| `/tong-hop` | TongHop | `PERM_XEM_TONG_HOP` |
| `/xu-huong` | XuHuong | `PERM_XEM_TONG_HOP` |
| `/tien-do-kp` | TienDoKP | `PERM_XEM_TIEN_DO_KP` |
| `/bao-cao` | BaoCao | `PERM_XEM_TONG_HOP` |
| `/tai-khoan` | TaiKhoan | `PERM_QUAN_LY_TAI_KHOAN` |
| `/cau-hinh/khoa-vitri` | CauHinhKhoaViTri | `PERM_CAU_HINH` |
| `/cau-hinh/vi-tri` | CauHinhViTri | `PERM_CAU_HINH` |
| `/cau-hinh/dot-danh-gia` | CauHinhDotDanhGia | `PERM_CAU_HINH` |
| `/cau-hinh/tieu-chi` | CauHinhTieuChi | `PERM_CAU_HINH` |
| `/huong-dan` | *(chưa mở, route bị comment trong App.tsx)* | — |

`Sidebar.tsx` dùng đúng các nhóm quyền trên để ẩn/hiện menu item — luôn sửa đồng bộ 2 nơi (route + sidebar) khi đổi phân quyền một trang.

### Hệ thống quyền (`features/auth/permissions.ts`)

Danh sách slug quyền (`PERMISSION.*`) **phải khớp 1-1** với backend `server_qlcl/middleware/actionDefault.js` — copy tay, không tự sync. 13 slug, chia theo 4 role: Admin, Phòng QLCL, Trưởng khoa, Nhân viên (sơ đồ tham khảo: `map.jpg` trong `server_qlcl`). File này gom slug thành các nhóm `PERM_*` (anyOf) dùng chung cho cả route và sidebar, ví dụ `PERM_XEM_ANH_5S` chỉ gồm Admin + Phòng QLCL (Trưởng khoa/Nhân viên không thấy mục Ảnh 5S / Nhóm Zalo 5S).

### Đăng nhập & token (`features/auth/`)

- `authSlice.ts`: thunk `loginUser` (POST `/login`) và `restoreSession` (GET `/login-by-token`, gọi lại khi load app nếu còn token lưu — BE cấp token mới mỗi lần).
- `tokenStorage.ts`: "Ghi nhớ đăng nhập" → lưu `localStorage`; bỏ tick → lưu `sessionStorage` (mất khi đóng tab).
- Token gửi lên BE qua header **`token`** (không phải `Authorization: Bearer`).
- `axiosClient.ts` tự phát hiện 2 kiểu lỗi từ BE (không dùng chuẩn HTTP status):
  - Wrapper `Response()`: `{statusCode, message, data}`, lỗi khi `statusCode !== 200`.
  - Middleware auth (`isAuthAdmin`, `check_permission`): `{signal: 0, code, message}`, HTTP status luôn 200.
  - Code `401/402/403/405` → tự `clearToken()` + phát event `authEvents` → `AuthExpiredListener` bắt và đăng xuất.

## Tầng gọi API (`features/qlcl/api.ts`)

Map gần như 1-1 với route backend `server_qlcl/routes/*` (base `/api`): `khoa`, `vitri-type`, `checklist-item`, `vitri-chi-tiet`, `danh-gia`, `khac-phuc`, `lich-phan-cong`, `anh-5s-tuan`, `dot-danh-gia`, `photo-gallery`, `user`, `role`, cộng `upload/uploadImage` (Cloudinary). Quy ước danh sách: GET `/api/{entity}/get-list-{entity}`; tạo/sửa dùng chung 1 endpoint `create-update-{entity}` (có `id` thì sửa).

Đáng chú ý:
- `createUpdateAnh5sTuan`: FE dùng field `vi_tri: number[]`, gửi lên BE dưới tên `vitri_type_ids`.
- `exportBaoCaoZaloHTML` / `exportBaoCaoZaloWord`: BE trả file trực tiếp (không bọc JSON) dạng blob; FE tự phát hiện nếu blob thực ra là JSON lỗi (do middleware auth trả `{signal:0}` với HTTP 200) thì parse ra `ApiError` thay vì tải file rác. Tên file lấy từ header `Content-Disposition`.
- `fetchDanhGiaById` trả kèm `sScores` — điểm từng nhóm S1–S5, backend tính sẵn.

`catalogSlice.ts` (`loadCatalog` thunk) fetch song song khoa/vị trí/user 1 lần, cache vào Redux (`catalog.khoaList`, `catalog.vitriTypes`, `catalog.users`) để các trang dùng chung, không phải gọi lại API mỗi lần vào trang.

## Mô hình dữ liệu 5S (khớp backend)

- **Khoa** — 49 khoa/phòng/TT, có `nhom` (Khối phòng/ban, Hệ cận LS, Hệ ngoại, Hệ nội, Trung tâm)
- **Vitri type** — loại vị trí đánh giá (buồng bệnh, phòng mổ, hành lang...)
- **Checklist item** — tiêu chí đánh giá, thuộc nhóm S1–S5 (`s_id/s_name/s_color`)
- **Vitri chi tiet** — vị trí cụ thể của 1 khoa (mã vị trí, vd "E203")
- **Danh gia** / **Danh gia chi tiet** — 1 lượt đánh giá và điểm từng tiêu chí, có thể gắn `dot_danh_gia_id`
- **Dot danh gia** — "đợt đánh giá" (chiến dịch), cấu hình ở `/cau-hinh/dot-danh-gia`
- **Khac phuc** — hành động khắc phục gắn với 1 tiêu chí không đạt
- **Photo gallery** — ảnh minh chứng (gắn 1 lượt đánh giá hoặc gửi độc lập)
- **Lich phan cong** — lịch phân công đánh giá theo khoa/tuần
- **Anh 5S tuan** — ghi nhận ảnh gửi nhóm Zalo 5S theo tuần, có bảng trung gian với vị trí

## 4 role nghiệp vụ

Admin, Phòng QLCL (toàn viện), Trưởng khoa (khoa mình), Nhân viên (làm đánh giá khoa mình) — sơ đồ chi tiết quyền theo role nằm ở `server_qlcl/map.jpg` và `middleware/actionDefault.js`.

## Khi thêm tính năng mới

- Thêm route mới: cập nhật cả `App.tsx` (route + `RequirePermission`) và `Sidebar.tsx` (nav item + permission group), giữ 2 nơi đồng bộ.
- Thêm quyền mới: thêm slug vào backend `middleware/actionDefault.js` trước, chạy `npm run seed` (backend) để nạp `role_permission`, rồi copy đúng slug sang `permissions.ts` (frontend).
- Thêm entity API mới: theo đúng quy ước `get-list-{entity}` / `create-update-{entity}` / `delete-{entity}` đã dùng trong `api.ts` để nhất quán.
