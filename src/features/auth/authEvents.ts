// Sự kiện DOM dùng để axiosClient (không có quyền truy cập Redux store trực tiếp,
// tránh import vòng store -> authSlice -> axiosClient -> store) báo cho phần còn lại
// của app biết phiên đăng nhập đã hết hạn/không hợp lệ, cần logout + điều hướng /login.
export const AUTH_EXPIRED_EVENT = 'qlcl:auth-expired'

export function dispatchAuthExpired() {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}
