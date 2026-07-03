import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAppSelector } from '../../app/hooks'

export default function AppLayout() {
  const open = useAppSelector((s) => s.ui.sidebarOpen)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={`transition-all duration-200 ${open ? 'ml-64' : 'ml-[84px]'}`}
      >
        <Header />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
