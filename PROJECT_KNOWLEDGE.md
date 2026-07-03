# Server_QLCL — Tài liệu tổng hợp dự án (cập nhật 2026-07-02)

Hệ thống Quản lý Chất lượng 5S cho Bệnh viện (chuyển đổi từ boilerplate bán hàng `server_nodejs_mysql` cũ). Backend Node.js/Express/Sequelize/MySQL, đã dựng xong toàn bộ CSDL + API, đã rà bug, test Postman, và đẩy lên GitHub riêng.

## 1. Vị trí code

| Nơi | Đường dẫn |
|---|---|
| Code đang chạy (dev) | `D:\My-project\Hospital\hospital_server` — **`.git` cũ ở đây bị hỏng/khóa, KHÔNG dùng để push** |
| Bản git sạch đã push | `D:\My-project\Hospital\hospital_server\server_qlcl_push` (subfolder, có `.git` riêng, remote `origin` → GitHub) |
| GitHub repo | https://github.com/dung-20cm/server_qlcl (**Private**, 1 commit lịch sử sạch, không chứa `.env`/secret cũ) |

**Lưu ý quan trọng:** thư mục `hospital_server` gốc còn một nhánh mồ côi hỏng dở tên `server_qlcl_clean` (tàn dư từ lúc dọn lịch sử git, bị kẹt `.git/index.lock`). Đừng cố sửa nhánh đó — cứ tiếp tục code trong `hospital_server` như bình thường, và khi cần push thì đồng bộ file sang `server_qlcl_push` rồi push từ đó (hoặc dọn `.git` cũ vào dịp khác).

## 2. Stack & khởi động

- Node.js + Express, Sequelize (mysql2), JWT (`jsonwebtoken`), bcrypt/bcryptjs, Cloudinary (upload ảnh), ExcelJS (export Excel).
- CSDL MySQL: `Server_QLCL` (local, tạo qua MySQL Workbench).
- Cấu hình: `.env` (không commit) — `DB_*`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `CLOUDINARY_*`, `API_SERVER`.
- Chạy: `npm run dev` (nodemon `server.js`, port mặc định 8080). `model/index.js` tự `.sync()` tất cả bảng theo đúng thứ tự phụ thuộc khóa ngoại.
- Seed có sẵn: `npm run seed` (role/permission/role_permission), `npm run seed:khoa` (49 khoa), `npm run seed:vitri` (20 vị trí), `npm run seed:checklist` (420 tiêu chí).

## 3. Kiến trúc code

- Mẫu `BaseModel` + `static association()` — mỗi model tự khai báo quan hệ (belongsTo/hasMany) trong hàm này, được gọi tập trung từ `model/index.js` sau khi tất cả model đã `init`.
- Mỗi bảng nghiệp vụ có đủ 4 file: `model/*.model.js`, `service/*.service.js`, `controllers/*.controller.js`, `routes/*.routes.js` — controller mỏng (chỉ gọi service), service chứa logic + Sequelize query.
- Ghi nhiều bảng cùng lúc dùng `sequelize.transaction()` (ví dụ `createDanhGia`, `createUpdateAnh5sTuan`).
- Bảng trung gian nhiều-nhiều (`anh_5s_tuan_vitri`) dùng pattern destroy-rồi-bulkCreate khi update, không lưu mảng trong 1 cột.
- Response chuẩn hoá qua `config/handle_response.js` (`Response(fn)` wrapper bọc quanh mọi hàm controller).
- Lỗi nghiệp vụ ném qua `throw new Error(ERROR_MESSAGE.X)`, danh sách message ở `config/error.js`.

## 4. Sơ đồ CSDL — 16 bảng

### Nhóm Auth/RBAC (đã có từ trước)
- **user**: id, username, email(unique), mobile, address, password(hash), avatar, status, del.
- **role**: id, name, slug, del. hasOne `user_role`, hasMany `role_permission`.
- **permission**: id, name, slug, del. hasMany `role_permission`.
- **user_role**: user_id, role_id, del — gán 1 user 1 role.
- **role_permission**: role_id, permission_id, del — ma trận quyền theo role.
- Danh sách slug quyền theo 4 role (Admin / Phòng QLCL / Trưởng khoa / Nhân viên) nằm ở `middleware/actionDefault.js`, dùng làm tham số cho `check_permission(slug)`.

### Nhóm nghiệp vụ 5S (11 bảng, làm trong phiên này + trước đó)
- **khoa**: id, ten_khoa(unique), nhom (Khối phòng/ban, Hệ cận LS, Hệ ngoại, Hệ nội, Trung tâm), active. → hasMany vitri_chi_tiet, danh_gia, lich_phan_cong, anh_5s_tuan.
- **vitri_type**: id, ten_vitri(unique, vd "1. Buồng bệnh"), thu_tu, active. → hasMany checklist_item, vitri_chi_tiet, danh_gia, lich_phan_cong, anh_5s_tuan_vitri.
- **checklist_item**: id, vitri_type_id(FK), s_id/s_name/s_color/s_lt (nhóm 5S: S1..S5), sub, tc (nội dung tiêu chí), thu_tu, active.
- **vitri_chi_tiet**: id, khoa_id(FK), vitri_type_id(FK), ma_vitri (vd "E203"), ghi_chu, active. → hasMany danh_gia.
- **danh_gia**: id, khoa_id, vitri_type_id, vitri_chi_tiet_id(nullable), nguoi_danh_gia_id(FK user), ngay_danh_gia, dot_danh_gia, so_tieu_chi_dat, so_tieu_chi_tong, pct, xep_loai, active. → hasMany danh_gia_chi_tiet, anh (photo_gallery).
- **danh_gia_chi_tiet**: id, danh_gia_id(FK), checklist_item_id(FK), ket_qua (1 đạt/0 không đạt/NULL chưa đánh giá), ghi_chu. → hasMany khac_phuc.
- **khac_phuc**: id, danh_gia_chi_tiet_id(FK), nguoi_phu_trach_id(FK user, nullable), hanh_dong_khac_phuc, han_xu_ly, tuan, trang_thai (Chưa bắt đầu/Đang xử lý/Đã xong), ghi_chu, active.
- **photo_gallery**: id, danh_gia_id(FK), checklist_item_id(FK, nullable = ảnh chung), url_anh (Cloudinary), ten_file, mime_type, active.
- **lich_phan_cong**: id, khoa_id(FK), vitri_type_id(FK, nullable="tất cả vị trí"), loai_lich(dinh_ky mặc định), thu_trong_tuan(1-7, nullable), ngay_thuc_hien(nullable), nguoi_thuc_hien_id(FK user) — quy ước 1 dòng = 1 người, phân công nhiều người thì tạo nhiều dòng, ghi_chu, active.
- **anh_5s_tuan**: id, khoa_id(FK), tuan (mốc thứ 2 đầu tuần), so_luong_anh, chat_luong, ghi_chu, active. → hasMany vi_tri (anh_5s_tuan_vitri).
- **anh_5s_tuan_vitri** (bảng trung gian, không có cột active): id, anh_5s_tuan_id(FK), vitri_type_id(FK).

## 5. RBAC — 2 kiểu middleware

- `check_permission(slug)` — dùng cho route chỉ 1 role cụ thể được vào (vd `TAO_TAI_KHOAN` chỉ Admin). Kiểm tra token → user → user_role → role_permission chứa đúng slug.
- `isAuthAdmin` — chỉ cần đăng nhập hợp lệ (bất kỳ role nào), dùng cho các route nghiệp vụ đa vai trò (danh_gia, khac_phuc, lich_phan_cong, anh_5s_tuan, upload ảnh...) vì phân quyền chi tiết theo hành động chưa được yêu cầu ở mức route, xử lý ở tầng nghiệp vụ nếu cần sau này.
- Secret JWT lấy từ `.env` (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`), có fallback hardcode nếu thiếu env (nên bỏ fallback khi lên production thật).

## 6. Danh sách endpoint chính (base `/api`)

`/khoa`, `/vitri-type`, `/checklist-item`, `/vitri-chi-tiet`, `/danh-gia`, `/khac-phuc`, `/photo-gallery`, `/lich-phan-cong`, `/anh-5s-tuan`, `/permission`, `/role`, `/exportExcel`, cộng route auth ở root (`/login`, `/register`, `/login-by-token`, `/update_profile`, `/change_password`) và quản lý user (`/api/user/get-list-user`, `update_user`, `delete_user`). Upload ảnh: `POST /api/upload/uploadImage` (đã gắn `isAuthAdmin`, upload thẳng lên Cloudinary).

## 7. Bug đã tìm & đã sửa trong phiên rà soát

1. **Lỗ hổng phân quyền nghiêm trọng**: `check_permission` dùng `if (!list_permission && list_permission.length <= 0)` (AND sai logic) → sửa thành `||`. Bug này khiến user không có quyền vẫn lọt qua kiểm tra trong một số trường hợp. Đã verify bằng test Postman A/B (nhân viên bị chặn, admin được vào) trên cùng 1 endpoint.
2. Route upload ảnh (`/api/upload/uploadImage`) trong `server.js` không có middleware xác thực → đã thêm `isAuthAdmin`.
3. `service/user.service.js` → `updateUser`: check email trùng dùng `Op.like '%email%'` (dò lan, sai) và `Op.notLike` cho loại trừ id hiện tại (sai kiểu) → sửa thành so khớp chính xác `email: data.email` + `id: { [Op.ne]: data.id }`.
4. `config/auth.config.js` hardcode secret JWT → đọc từ `.env` với fallback.
5. Hàm `isAuth` chết (không bao giờ gọi `next()`, không được export/dùng ở đâu) trong `middleware/auth.js` → đã xoá.
6. Export Excel danh sách user còn tiêu đề cũ "DỰ ÁN QUẢN LÝ BÁN HÀNG - LẠI THẾ DŨNG" (tàn dư dự án cũ) → đổi thành "HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG 5S - BỆNH VIỆN".

## 8. Trạng thái test

Đã test bằng Postman (dùng `pm.globals.set` lưu token, vì các tab request rời không nằm trong collection nên `pm.collectionVariables` không hoạt động): Auth (login/register), Khoa, Vitri Type, Checklist Item, Vitri Chi Tiet, Danh Gia, Khac Phuc, Photo Gallery, Lich Phan Cong, Anh 5S Tuan — toàn bộ CRUD + luồng nghiệp vụ chính đều pass, kể cả test phân quyền A/B sau khi sửa bug #1.

## 9. Vấn đề kỹ thuật cần nhớ (môi trường làm việc)

- **Bug đọc file qua bash mount**: đọc file qua công cụ bash (kể cả `cat`/`wc -l`/`rsync`) đôi khi trả về nội dung **cũ/bị cắt cụt**, đặc biệt với file vừa sửa gần đây, dù `Read` tool (không qua bash) luôn chính xác. Cách khắc phục đã dùng: đọc bằng `Read` tool → ghi lại bằng `Write` tool → `cp` đè vào chỗ cần trong bash. Nếu debug thấy file "thiếu code" một cách khó hiểu qua bash, nghi ngờ bug này trước.
- **Chỉ thư mục đã kết nối (`D:\My-project\Hospital\hospital_server`) mới đồng bộ 2 chiều với máy người dùng** — tạo thư mục "anh em" (sibling) bên ngoài nó (vd ở cấp `Hospital\`) sẽ không hiện trên máy thật. Muốn tạo output mới cho người dùng thấy, phải tạo **bên trong** thư mục đã kết nối (như đã làm với `server_qlcl_push`).
- VS Code / Git Bash / mọi terminal đều ở tier "click" qua computer-use (không gõ phím được) — mọi lệnh git/npm cần chạy phải nhờ người dùng gõ, hoặc dùng công cụ bash sandbox (không có credential thật của máy người dùng nên không tự push được).

## 10. Việc còn để ngỏ / gợi ý cho ngày mai

- Dọn `.git` gốc trong `hospital_server` (xoá nhánh mồ côi `server_qlcl_clean`, gỡ lock, hoặc đơn giản là xoá `.git` cũ và `git init` lại trỏ thẳng remote mới — tránh phải qua bước trung gian `server_qlcl_push` mỗi lần push).
- Bỏ fallback hardcode secret JWT trong `config/auth.config.js` trước khi deploy thật.
- Xem lại `isAuthAdmin` dùng tràn lan cho route nghiệp vụ đa vai trò — nếu cần phân quyền chi tiết hơn theo hành động (vd nhân viên chỉ được xem khoa mình, trưởng khoa chỉ phân công trong khoa mình) thì phải bổ sung kiểm tra ở tầng service, hiện chưa có.
- Frontend/giao diện: file `5S_Dashboard_BVTB_v4.html` là bản phân tích chức năng gốc dùng để thiết kế schema — chưa có tích hợp frontend thật với API.
- Cân nhắc viết thêm test tự động (hiện chỉ test tay qua Postman, chưa có test suite).
