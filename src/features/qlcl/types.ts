// ── Types khớp response backend hospital_server (đã dò trực tiếp qua API) ──
// Mọi list endpoint trả về: { statusCode, message, data: { rows: T[], total: number } }

export interface ListData<T> {
  rows: T[]
  total: number
}

export interface Khoa {
  id: number
  ten_khoa: string
  nhom: string
  active: number
}

export interface VitriType {
  id: number
  ten_vitri: string
  thu_tu: number
  active: number
}

export interface ChecklistItem {
  id: number
  vitri_type_id: number
  s_id: string // "S1".."S5"
  s_name: string // Sàng lọc...
  s_color: string // "#D85A30"
  s_lt: string // màu nền nhạt
  sub: string // "3 Không (1)", "AT1"...
  tc: string // nội dung tiêu chí
  thu_tu: number
  active: number
  vitri_type?: { id: number; ten_vitri: string }
}

export interface VitriChiTiet {
  id: number
  khoa_id: number
  vitri_type_id: number
  ma_vitri: string
  ghi_chu: string | null
  active: number
  khoa?: { id: number; ten_khoa: string }
  vitri_type?: { id: number; ten_vitri: string }
}

export interface UserLite {
  id: number
  username: string
  email: string
  khoa_id?: number | null
  khoa?: { id: number; ten_khoa: string } | null
}

export interface Role {
  id: number
  name: string
  slug: string
}

// User đầy đủ từ /api/user/get-list-user (kèm role + khoa)
export interface UserFull {
  id: number
  username: string
  email: string | null
  khoa_id: number | null
  mobile: string | null
  address: string | null
  avatar: string | null
  status: number // 1 hoạt động / 0 khoá
  user_role?: { user_id: number; role_id: number; role?: Role | null } | null
  khoa?: { id: number; ten_khoa: string; nhom?: string } | null
}

// Payload tạo (không id) / cập nhật (có id) user — POST /api/user/update_user
export interface UserUpsertPayload {
  id?: number
  username: string
  password?: string // bắt buộc khi tạo, để trống khi sửa nếu không đổi
  email?: string | null
  khoa_id?: number | null
  mobile?: string | null
  role_id: number
  status?: number
}

export interface DanhGia {
  id: number
  khoa_id: number
  vitri_type_id: number
  vitri_chi_tiet_id: number | null
  nguoi_danh_gia_id: number
  // Cán bộ ĐỒNG đánh giá (ngoài nguoi_danh_gia_id) — chuỗi id nối dấu phẩy, VD "5,12"
  dong_danh_gia_ids?: string | null
  ngay_danh_gia: string // "2026-07-02"
  dot_danh_gia: string
  so_tieu_chi_dat: number
  so_tieu_chi_tong: number
  pct: number
  xep_loai: string
  active: number
  createdAt: string
  khoa?: { id: number; ten_khoa: string }
  vitri_type?: { id: number; ten_vitri: string }
  vitri_chi_tiet?: { id: number; ma_vitri: string } | null
  nguoi_danh_gia?: { id: number; username: string; email: string }
  // Danh sách cán bộ đồng đánh giá đã resolve tên (backend trả sẵn từ dong_danh_gia_ids)
  dong_danh_gia?: { id: number; username: string; email: string }[]
  // Tỷ lệ đạt từng nhóm S1..S5 — backend tính sẵn trong get-list-danh-gia (tránh N+1 phía FE)
  sScores?: { id: string; name?: string; color?: string; lt?: string; ok: number; total: number; pct: number }[]
}

export interface DanhGiaChiTietPayload {
  checklist_item_id: number
  ket_qua: 0 | 1 | null // 1 đạt / 0 không đạt / null chưa đánh giá
  ghi_chu?: string
}

export interface CreateDanhGiaPayload {
  khoa_id: number
  vitri_type_id: number
  vitri_chi_tiet_id?: number | null
  nguoi_danh_gia_id: number
  dong_danh_gia_ids?: string | null
  ngay_danh_gia: string
  dot_danh_gia: string
  dot_danh_gia_id?: number | null // FK -> dot_danh_gia.id (đợt cấu hình)
  chi_tiet: DanhGiaChiTietPayload[]
}

export interface DanhGiaChiTiet {
  id: number
  danh_gia_id: number
  checklist_item_id: number
  ket_qua: 0 | 1 | null
  ghi_chu: string | null
  checklist_item?: ChecklistItem
  danh_gia?: DanhGia
}

export interface KhacPhuc {
  id: number
  danh_gia_chi_tiet_id: number
  nguoi_phu_trach_id: number | null
  hanh_dong_khac_phuc: string
  han_xu_ly: string | null
  tuan: string | null
  trang_thai: string // Chưa bắt đầu / Đang xử lý / Đã xong...
  ghi_chu: string | null
  active: number
  createdAt: string
  danh_gia_chi_tiet?: DanhGiaChiTiet
  nguoi_phu_trach?: UserLite | null
}

export interface LichPhanCong {
  id: number
  khoa_id: number
  vitri_type_id: number | null
  // FK -> dot_danh_gia.id — "Loại lịch" giờ chọn từ danh sách Đợt đánh giá thực tế
  // (GET /api/dot-danh-gia/get-list-dot-danh-gia) thay vì 3 option cố định.
  dot_danh_gia_id: number | null
  loai_lich: string // dinh_ky | mot_lan | dot_xuat — tự suy ra từ tên đợt đã chọn (xem inferLoaiLichFromTenDot)
  thu_trong_tuan: number | null // 1=Thứ 2 ... 7=CN
  ngay_thuc_hien: string | null
  nguoi_thuc_hien_id: number
  ghi_chu: string | null
  active: number
  createdAt?: string
  khoa?: { id: number; ten_khoa: string }
  vitri_type?: { id: number; ten_vitri: string } | null
  nguoi_thuc_hien?: UserLite
  dot?: { id: number; ten_dot: string; trang_thai?: string } | null
}

export interface Anh5sTuanViTri {
  id: number
  anh_5s_tuan_id: number
  vitri_type_id: number
  vitri_type?: { id: number; ten_vitri: string }
}

export interface Anh5sTuan {
  id: number
  khoa_id: number
  tuan: string // ngày thứ 2 đầu tuần "2026-07-06"
  so_luong_anh: number
  chat_luong: string
  ghi_chu: string | null
  active: number
  khoa?: { id: number; ten_khoa: string }
  vi_tri?: Anh5sTuanViTri[]
}

// "Kết quả" gán cho ảnh gửi độc lập (không qua Bảng kiểm) — khớp nhãn dùng ở Bảng kiểm/legacy
export const KET_QUA_ANH_OPTIONS = ['Đạt tốt', 'Đạt', 'Chưa đạt'] as const
export type KetQuaAnh = (typeof KET_QUA_ANH_OPTIONS)[number]

export interface PhotoGallery {
  id: number
  danh_gia_id: number | null
  checklist_item_id: number | null
  url_anh: string
  ten_file: string | null
  mime_type: string | null
  // Chỉ có giá trị khi ảnh gửi độc lập (danh_gia_id = null)
  khoa_id: number | null
  vitri_type_id: number | null
  ngay_chup: string | null
  nguoi_gui_id: number | null
  ket_qua: string | null
  ghi_chu: string | null
  active: number
  createdAt: string
  danh_gia?: DanhGia
  checklist_item?: ChecklistItem | null
  khoa?: { id: number; ten_khoa: string } | null
  vitri_type?: { id: number; ten_vitri: string } | null
  nguoi_gui?: { id: number; username: string; email: string } | null
}

// Đợt đánh giá (bảng dot_danh_gia) — cấu hình các đợt/chiến dịch đánh giá 5S
export interface DotDanhGia {
  id: number
  ten_dot: string
  tu_ngay: string | null
  den_ngay: string | null
  mo_ta: string | null
  trang_thai: string // dang-mo | da-dong
  active: number
  createdAt?: string
}

// ── Helper xếp loại (đồng bộ với dashboard cũ + NĐ báo cáo) ──
export function xepLoaiFromPct(pct: number): { label: string; tone: Tone } {
  if (pct >= 90) return { label: 'Xuất sắc', tone: 'excellent' }
  if (pct >= 75) return { label: 'Tốt', tone: 'good' }
  if (pct >= 60) return { label: 'Khá', tone: 'fair' }
  return { label: 'Cần cải thiện', tone: 'poor' }
}

export type Tone = 'excellent' | 'good' | 'fair' | 'poor'

export const toneBadgeClass: Record<Tone, string> = {
  excellent: 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20',
  good: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  fair: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:ring-yellow-500/20',
  poor: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20',
}

export function toneFromPct(pct: number): Tone {
  return xepLoaiFromPct(pct).tone
}

export const DOT_DANH_GIA_OPTIONS = ['Đợt 1', 'Đợt 2', 'Định kỳ', 'Tự đánh giá', 'Đột xuất']
