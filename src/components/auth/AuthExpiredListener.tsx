import { useEffect } from 'react'
import { useAppDispatch } from '../../app/hooks'
import { AUTH_EXPIRED_EVENT } from '../../features/auth/authEvents'
import { logout } from '../../features/auth/authSlice'

// Lắng nghe sự kiện do axiosClient bắn ra khi API trả về phiên đăng nhập
// không hợp lệ/hết hạn (token sai, hết hạn, tài khoản bị xoá...) để tự logout.
// Đặt 1 lần ở gốc app (trong App.tsx), không render gì cả.
export default function AuthExpiredListener() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    function handleExpired() {
      dispatch(logout())
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [dispatch])

  return null
}
