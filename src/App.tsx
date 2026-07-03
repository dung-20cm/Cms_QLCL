import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Placeholder from './pages/Placeholder'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bang-kiem" element={<Placeholder title="Bảng kiểm" />} />
        <Route path="/lich-danh-gia" element={<Placeholder title="Lịch đánh giá" />} />
        <Route path="/zalo-5s" element={<Placeholder title="Nhóm Zalo 5S" />} />
        <Route path="/tong-hop" element={<Placeholder title="Tổng hợp" />} />
        <Route path="/xu-huong" element={<Placeholder title="Xu hướng" />} />
        <Route path="/tien-do-kp" element={<Placeholder title="Tiến độ khắc phục" />} />
        <Route path="/bao-cao" element={<Placeholder title="Báo cáo" />} />
        <Route path="/huong-dan" element={<Placeholder title="Hướng dẫn sử dụng" />} />
        <Route path="/cau-hinh" element={<Placeholder title="Cấu hình" />} />
      </Route>
    </Routes>
  )
}

export default App
