import { Outlet, useLocation } from "react-router-dom";

// Bọc Outlet -- key theo pathname để mỗi lần chuyển route, div này được React
// coi là phần tử MỚI (remount), lặp lại animation "page-in" thay vì nội dung
// trang cũ biến mất và trang mới xuất hiện đột ngột không hiệu ứng.
export default function PageTransition() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-in">
      <Outlet />
    </div>
  );
}
