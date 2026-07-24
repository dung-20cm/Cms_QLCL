import Sidebar from './Sidebar'
import Header from './Header'
import TodayLichBanner from './TodayLichBanner'
import PageTransition from './PageTransition'
import { useAppSelector } from '../../app/hooks'

export default function AppLayout() {
  const open = useAppSelector((s) => s.ui.sidebarOpen)

  return (
    // animate-fade-in chỉ chạy 1 lần khi vào khu vực đã đăng nhập (sau khi login
    // hoặc load lại trang) -- làm mượt bước chuyển từ màn hình đăng nhập/loading
    // sang giao diện chính thay vì hiện ra đột ngột.
    <div className="min-h-screen animate-fade-in bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div
        className={`transition-all duration-200 ${open ? 'ml-64' : 'ml-[84px]'}`}
      >
        <Header />
        <TodayLichBanner />
        <main className="p-4 sm:p-6">
          <PageTransition />
        </main>
      </div>
    </div>
  )
}
