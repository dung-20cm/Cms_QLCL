// Danh sách slug quyền (permission.slug) — PHẢI khớp với backend `middleware/actionDefault.js`
// (D:\My-project\Hospital\hospital_server\middleware\actionDefault.js), dùng để gate UI theo quyền
// nhận được từ API đăng nhập (field `list_permission`).
export const PERMISSION = {
  // Admin
  XEM_TOAN_QUYEN_BAO_CAO_LICH: 'xem-toan-quyen-bao-cao-lich',
  TAO_TAI_KHOAN: 'tao-tai-khoan',
  PHAN_QUYEN_TAI_KHOAN: 'phan-quyen-tai-khoan',
  CAU_HINH_DOT_DANH_GIA: 'cau-hinh-dot-danh-gia',
  CAU_HINH_PHONG_KHOA_KIEM_TRA: 'cau-hinh-phong-khoa-kiem-tra',

  // Phòng QLCL
  XEM_TONG_HOP_TAT_CA_KHOA: 'xem-tong-hop-tat-ca-khoa',
  DANH_GIA_CAC_KHOA: 'danh-gia-cac-khoa',
  XEM_TIEN_DO_KHAC_PHUC_TAT_CA_KHOA: 'xem-tien-do-khac-phuc-tat-ca-khoa',

  // Trưởng khoa
  PHAN_CONG_DANH_GIA: 'phan-cong-danh-gia',
  XEM_TONG_HOP_KHOA_MINH: 'xem-tong-hop-khoa-minh',
  XEM_TIEN_DO_KHAC_PHUC_KHOA_MINH: 'xem-tien-do-khac-phuc-khoa-minh',
  TAO_TAI_KHOAN_NHAN_VIEN: 'tao-tai-khoan-nhan-vien',

  // Nhân viên
  LAM_DANH_GIA: 'lam-danh-gia',

  // Dùng chung (mọi role đã đăng nhập)
  DOI_MAT_KHAU: 'doi-mat-khau',
} as const

export type PermissionSlug = (typeof PERMISSION)[keyof typeof PERMISSION]

// ===== Nhóm quyền dùng để gate menu / route theo sơ đồ map.jpg =====
// Xem tổng hợp / xu hướng / báo cáo / lịch: Admin (toàn quyền), QLCL (tất cả khoa), Trưởng khoa (khoa mình)
export const PERM_XEM_TONG_HOP = [
  PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH,
  PERMISSION.XEM_TONG_HOP_TAT_CA_KHOA,
  PERMISSION.XEM_TONG_HOP_KHOA_MINH,
] as const

// Làm / chấm bảng kiểm đánh giá: QLCL (đánh giá các khoa), Nhân viên (làm đánh giá)
export const PERM_DANH_GIA = [
  PERMISSION.DANH_GIA_CAC_KHOA,
  PERMISSION.LAM_DANH_GIA,
] as const

// Xem lịch đánh giá: nhóm xem tổng hợp + người tham gia đánh giá + trưởng khoa phân công
export const PERM_XEM_LICH = [
  ...PERM_XEM_TONG_HOP,
  ...PERM_DANH_GIA,
  PERMISSION.PHAN_CONG_DANH_GIA,
] as const

// Xem tiến độ khắc phục: Admin, QLCL (tất cả khoa), Trưởng khoa (khoa mình)
export const PERM_XEM_TIEN_DO_KP = [
  PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH,
  PERMISSION.XEM_TIEN_DO_KHAC_PHUC_TAT_CA_KHOA,
  PERMISSION.XEM_TIEN_DO_KHAC_PHUC_KHOA_MINH,
] as const

// Ảnh 5S / Nhóm Zalo 5S: nhóm xem + nhóm đánh giá (nhân viên cần up/xem ảnh khi làm đánh giá)
export const PERM_XEM_ANH_5S = [...PERM_XEM_TONG_HOP, ...PERM_DANH_GIA] as const

// Cấu hình hệ thống: Admin
export const PERM_CAU_HINH = [
  PERMISSION.CAU_HINH_DOT_DANH_GIA,
  PERMISSION.CAU_HINH_PHONG_KHOA_KIEM_TRA,
] as const

// Quản lý tài khoản: Admin (tạo TK, phân quyền), Trưởng khoa (tạo TK nhân viên khoa mình)
export const PERM_QUAN_LY_TAI_KHOAN = [
  PERMISSION.TAO_TAI_KHOAN,
  PERMISSION.PHAN_QUYEN_TAI_KHOAN,
  PERMISSION.TAO_TAI_KHOAN_NHAN_VIEN,
] as const
