// Khớp với payload trả về từ backend (service/user.service.js -> login/getProfile)
export interface AuthUser {
  id: number
  username: string
  email: string
  mobile: string | null
  address: string | null
  status: number
  avatar: string | null
  // Backend trả kèm khoa của user (dùng mặc định cho Bảng kiểm tự đánh giá)
  khoa_id?: number | null
  khoa?: { id: number; ten_khoa: string; nhom?: string } | null
}

export interface PermissionItem {
  id: number
  name: string
  slug: string
}

export interface LoginPayload {
  username: string
  password: string
  remember: boolean
}

export interface LoginResponseData {
  token: string
  refreshToken: string
  user: AuthUser
  // BE /login trả quyền lồng trong `role` (service/user.service.js -> login)
  role?: {
    role: string
    slug: string
    list_permission: PermissionItem[]
  }
  // giữ tương thích nếu BE trả list_permission ở top-level (như /login-by-token)
  list_permission?: PermissionItem[]
}

export interface ProfileResponseData {
  user: AuthUser
  list_permission: PermissionItem[]
  token: string
}
