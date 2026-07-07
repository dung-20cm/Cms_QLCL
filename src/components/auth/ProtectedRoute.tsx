import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'
import AuthLoadingScreen from './AuthLoadingScreen'

// Bọc quanh các route yêu cầu đăng nhập. Chưa đăng nhập => đá về /login,
// nhớ lại đường dẫn đang đứng (from) để login xong quay lại đúng chỗ.
export default function ProtectedRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const initializing = useAppSelector((s) => s.auth.initializing)
  const location = useLocation()

  if (initializing) return <AuthLoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
