# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tổng quan dự án

Dashboard điện tử quản lý chất lượng 5S cho Bệnh viện Đa khoa Thái Bình — Phòng Quản lý Chất lượng. Đây là ứng dụng SPA (Single Page Application) dùng HTML5/CSS3/JavaScript thuần, không có bước build.

## Cách chạy ứng dụng

Không cần build. Mở trực tiếp trong trình duyệt:
- `login.html` — trang đăng nhập (điểm vào chính)
- `5S_Dashboard_BVTB.html` — dashboard chính (yêu cầu session hợp lệ trong localStorage)

Backend (nếu cần): `cd ../hospital_server && npm install && node server.js`
Backend cần file `.env` với thông tin MySQL, JWT secret và Cloudinary.

## Cấu trúc file

| File | Dòng | Mô tả |
|------|------|-------|
| `login.html` | ~283 | Trang đăng nhập với 49 tài khoản mockdata |
| `5S_Dashboard_BVTB.html` | ~4059 | **File chính** — toàn bộ ứng dụng (HTML + CSS + JS trong 1 file) |
| `5S_Dashboard_BVTB1.html` | ~4059 | **Giống hệt BVTB.html** — dùng làm nguồn gốc khi merge |

> `5S_Dashboard_BVTB.html` được tạo ra bằng cách gộp:
> - Tính năng **Lịch đánh giá** + **Nhóm Zalo 5S** từ phiên bản cũ
> - Hệ thống **phân quyền theo role** + **Tự đánh giá/So sánh** từ BVTB1.html
> - Đã **bỏ** toàn bộ kết nối Google Sheets

## Kiến trúc

### Hệ thống phân quyền (Auth)

Đoạn script đầu tiên trong `<body>` chạy auth check ngay trước khi render:
```javascript
window._AUTH = {
  session, isAdmin,   // isAdmin = true nếu là "Phòng Quản lý chất lượng"
  khoa, name, username, logout
}
```
- Session lưu trong localStorage key `bvtb_session`, TTL 8 giờ
- Nếu chưa đăng nhập → redirect về `login.html`
- Tab **Lịch đánh giá**, **Nhóm Zalo 5S**, **Cấu hình** chỉ hiện cho admin

### Cấu trúc tab (9 tab, chuyển bằng `goTab(id, btn)`)

| # | Tab | ID trang | Mô tả |
|---|-----|----------|-------|
| 1 | 📋 Bảng kiểm | `page-bk` | Form đánh giá + tự đánh giá theo đợt (user thường) |
| 2 | 📅 Lịch đánh giá | `page-lich` | Lịch tuần, đột xuất, phân công cán bộ *(chỉ admin)* |
| 3 | 📸 Nhóm Zalo 5S | `page-zalo5s` | Theo dõi gửi ảnh lên nhóm Zalo *(chỉ admin)* |
| 4 | 📊 Tổng hợp | `page-tong` | Bảng tổng hợp + xuất CSV |
| 5 | 📈 Xu hướng | `page-xu` | Biểu đồ xu hướng SVG, 6 series |
| 6 | 📌 Tiến độ KP | `page-tiendo` | Theo dõi khắc phục |
| 7 | 🖨 Báo cáo | `page-bao` | Tạo báo cáo theo NĐ30/2020/NĐ-CP |
| 8 | 📖 Hướng dẫn | `page-huong` | Hướng dẫn sử dụng + bảng tiêu chí |
| 9 | ⚙ Cấu hình | `page-cfg` | Quản lý đợt tự đánh giá *(chỉ admin)* |

### Mô hình dữ liệu 5S

- **49 khoa/phòng/TT** (mảng `ALL_44_KHOA` — thực tế có 49 đơn vị)
- **19 loại vị trí** (buồng bệnh, phòng mổ, hành lang... — đối tượng `BANGKIEM_VITRI`)
- **21 tiêu chí** chia thành 5 nhóm S1–S5 (mảng `SC`)
- **12 cán bộ đánh giá** (hardcode trong modal Lịch và filter)

### Lưu trữ (localStorage keys)

| Key | Nội dung |
|-----|---------|
| `bvtb_session` | Phiên đăng nhập (user, role, khoa, loginAt) |
| `bvtb_5s_results_v2` | Kết quả đánh giá (QLCL đánh giá) |
| `bvtb_5s_kp_v1` | Hành động khắc phục |
| `bvtb_5s_lich_v1` | Danh sách lịch đánh giá |
| `bvtb_5s_anh_v1` | Ghi nhận ảnh Zalo 5S |
| `bvtb_windows` | Đợt tự đánh giá (windows) |
| `bvtb_5s_lich_ver` | Phiên bản lịch phân công (hiện tại: `v3`) |

### Chế độ tự đánh giá và so sánh

Khi admin tạo một "đợt tự đánh giá" (page-cfg), user thường đăng nhập sẽ:
- Thấy bảng kiểm được mở trong thời hạn đợt
- Tự đánh giá và lưu kết quả (type: `'self'`)

Admin QLCL có thể vào Bảng kiểm, chọn khoa + đợt → xem kết quả tự đánh giá → bấm **"Xem & Đánh giá lại"** để vào **compare mode** (`buildBKCompare(selfRec)`) — đánh giá song song từng tiêu chí với kết quả tự đánh giá của khoa.

### Lịch đánh giá

- Lịch phân công cố định `LICH_PHAN_CONG` — 35 mục, tự nạp khi khởi động (`loadLichPhanCong`)
- Lịch user thêm thủ công lưu theo key `bvtb_5s_lich_v1`
- Khi tăng `LICH_PC_VERSION` → lịch phân công sẽ tự reload vào tuần sau

### Nhóm Zalo 5S

- Mảng `anhList` lưu ghi nhận từng khoa gửi ảnh lên Zalo mỗi tuần
- Xuất được 2 định dạng: HTML/PDF (`exportBaoCaoZalo`) và Word (`exportZaloWord`)

### Báo cáo in (NĐ30/2020/NĐ-CP)

- Tiêu đề 2 cột (cơ quan bên trái, quốc hiệu bên phải)
- Bảng điểm từng tiêu chí S1–S5
- Hộp kết quả tổng: ≥90 = Xuất sắc, ≥75 = Tốt, ≥60 = Khá, <60 = Cần cải thiện
- Ký tên 2 cột (người đánh giá + trưởng khoa)
- CSS `@media print` ẩn toàn bộ UI, chỉ in `#print-area` — A4, Times New Roman

### CSS Design Tokens (`:root`)

| Biến | Giá trị | Dùng cho |
|------|---------|---------|
| `--navy` | `#1B3A5C` | Header, nút chính |
| `--teal` | `#1D9E75` | Trạng thái active, xác nhận |
| `--s1` → `--s5` | Cam/Vàng/Xanh lá/Xanh dương/Tím | Màu 5 nhóm S |
| `--ok/--warn/--danger` | Xanh/Vàng/Đỏ | Trạng thái kết quả |

## Mở rộng hệ thống

**Thêm khoa/phòng/TT:** Tìm mảng `ALL_44_KHOA` (trong JS) và `<select id="m-khoa">` (trong HTML), thêm vào cả hai nơi.

**Thêm tiêu chí đánh giá:** Tìm mảng `SC` (mỗi phần tử có `id`, `name`, `color`, `items[]`), thêm item vào nhóm S tương ứng.

**Thêm vị trí:** Tìm đối tượng `BANGKIEM_VITRI` và `<select id="m-vitri">`.

**Cập nhật lịch phân công:** Sửa mảng `LICH_PHAN_CONG` rồi tăng `LICH_PC_VERSION` lên `v4` để tự động reload.

Dữ liệu localStorage tương thích ngược — thêm mới không làm mất dữ liệu cũ.
