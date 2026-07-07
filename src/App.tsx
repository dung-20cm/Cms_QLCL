import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
// import Placeholder from "./pages/Placeholder"; // dùng lại khi mở route /huong-dan
import Login from "./pages/Login";
import BangKiem from "./pages/BangKiem";
import LichDanhGia from "./pages/LichDanhGia";
import Zalo5S from "./pages/Zalo5S";
import Anh5S from "./pages/Anh5S";
import TongHop from "./pages/TongHop";
import XuHuong from "./pages/XuHuong";
import TienDoKP from "./pages/TienDoKP";
import BaoCao from "./pages/BaoCao";
import TaiKhoan from "./pages/TaiKhoan";
import CauHinhKhoaViTri from "./pages/cauhinh/CauHinhKhoaViTri";
import CauHinhViTri from "./pages/cauhinh/CauHinhViTri";
import CauHinhDotDanhGia from "./pages/cauhinh/CauHinhDotDanhGia";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import GuestRoute from "./components/auth/GuestRoute";
import RequirePermission from "./components/auth/RequirePermission";
import AuthExpiredListener from "./components/auth/AuthExpiredListener";
import { useAppDispatch } from "./app/hooks";
import { restoreSession } from "./features/auth/authSlice";
import { getToken } from "./features/auth/tokenStorage";
import { useHasAnyPermission } from "./features/auth/usePermission";
import {
  PERM_XEM_TONG_HOP,
  PERM_DANH_GIA,
  PERM_XEM_LICH,
  PERM_XEM_ANH_5S,
  PERM_XEM_TIEN_DO_KP,
  PERM_CAU_HINH,
  PERM_QUAN_LY_TAI_KHOAN,
} from "./features/auth/permissions";

// Trang chủ theo quyền (map.jpg): role có quyền xem tổng hợp thì vào Dashboard,
// role chỉ làm đánh giá (Nhân viên) thì chuyển sang Bảng kiểm.
function Home() {
  const canViewDashboard = useHasAnyPermission(PERM_XEM_TONG_HOP);
  if (canViewDashboard) return <Dashboard />;
  return <Navigate to="/bang-kiem" replace />;
}

function App() {
  const dispatch = useAppDispatch();

  // Còn token đã lưu (localStorage/sessionStorage) từ phiên trước => xác thực lại với BE
  useEffect(() => {
    if (getToken()) {
      dispatch(restoreSession());
    }
  }, [dispatch]);

  return (
    <>
      <AuthExpiredListener />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route
              path="/bang-kiem"
              element={
                <RequirePermission slug={PERM_DANH_GIA}>
                  <BangKiem />
                </RequirePermission>
              }
            />
            <Route
              path="/lich-danh-gia"
              element={
                <RequirePermission slug={PERM_XEM_LICH}>
                  <LichDanhGia />
                </RequirePermission>
              }
            />
            <Route
              path="/zalo-5s"
              element={
                <RequirePermission slug={PERM_XEM_ANH_5S}>
                  <Zalo5S />
                </RequirePermission>
              }
            />
            <Route
              path="/anh-5s"
              element={
                <RequirePermission slug={PERM_XEM_ANH_5S}>
                  <Anh5S />
                </RequirePermission>
              }
            />
            <Route
              path="/tong-hop"
              element={
                <RequirePermission slug={PERM_XEM_TONG_HOP}>
                  <TongHop />
                </RequirePermission>
              }
            />
            <Route
              path="/xu-huong"
              element={
                <RequirePermission slug={PERM_XEM_TONG_HOP}>
                  <XuHuong />
                </RequirePermission>
              }
            />
            <Route
              path="/tien-do-kp"
              element={
                <RequirePermission slug={PERM_XEM_TIEN_DO_KP}>
                  <TienDoKP />
                </RequirePermission>
              }
            />
            <Route
              path="/bao-cao"
              element={
                <RequirePermission slug={PERM_XEM_TONG_HOP}>
                  <BaoCao />
                </RequirePermission>
              }
            />
            {/* <Route path="/huong-dan" element={<Placeholder title="Hướng dẫn sử dụng" />} /> */}
            <Route
              path="/tai-khoan"
              element={
                <RequirePermission slug={PERM_QUAN_LY_TAI_KHOAN}>
                  <TaiKhoan />
                </RequirePermission>
              }
            />
            {/* Cấu hình: 3 tab con trong sidebar */}
            <Route path="/cau-hinh" element={<Navigate to="/cau-hinh/khoa-vitri" replace />} />
            <Route
              path="/cau-hinh/khoa-vitri"
              element={
                <RequirePermission slug={PERM_CAU_HINH}>
                  <CauHinhKhoaViTri />
                </RequirePermission>
              }
            />
            <Route
              path="/cau-hinh/vi-tri"
              element={
                <RequirePermission slug={PERM_CAU_HINH}>
                  <CauHinhViTri />
                </RequirePermission>
              }
            />
            <Route
              path="/cau-hinh/dot-danh-gia"
              element={
                <RequirePermission slug={PERM_CAU_HINH}>
                  <CauHinhDotDanhGia />
                </RequirePermission>
              }
            />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
