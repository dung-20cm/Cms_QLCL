import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'
import AuthLoadingScreen from './AuthLoadingScreen'

// Bọc quanh route /login: đã đăng nhập rồi thì không cho xem lại form login nữa.
export default function GuestRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const initializing = useAppSelector((s) => s.auth.initializing)

  if (initializing) return <AuthLoadingScreen />
  if (isAuthenticated) return <Navigate to="/" replace />

  return <Outlet />
}
