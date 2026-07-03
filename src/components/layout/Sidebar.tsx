import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  ClipboardList,
  CalendarDays,
  ImageIcon,
  Table2,
  TrendingUp,
  Wrench,
  Printer,
  BookOpen,
  Settings,
} from 'lucide-react'
import { useAppSelector } from '../../app/hooks'

const navItems = [
  { to: '/', label: 'Analytics', icon: LayoutGrid },
  { to: '/bang-kiem', label: 'Bảng kiểm', icon: ClipboardList },
  { to: '/lich-danh-gia', label: 'Lịch đánh giá', icon: CalendarDays },
  { to: '/zalo-5s', label: 'Nhóm Zalo 5S', icon: ImageIcon },
  { to: '/tong-hop', label: 'Tổng hợp', icon: Table2 },
  { to: '/xu-huong', label: 'Xu hướng', icon: TrendingUp },
  { to: '/tien-do-kp', label: 'Tiến độ KP', icon: Wrench },
  { to: '/bao-cao', label: 'Báo cáo', icon: Printer },
  { to: '/huong-dan', label: 'Hướng dẫn', icon: BookOpen },
  { to: '/cau-hinh', label: 'Cấu hình', icon: Settings },
]

export default function Sidebar() {
  const open = useAppSelector((s) => s.ui.sidebarOpen)

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 ${
        open ? 'w-64' : 'w-[84px]'
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5 dark:border-gray-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
          5S
        </div>
        {open && (
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">QLCL 5S</p>
            <p className="text-xs text-gray-400">BV Đa khoa Thái Bình</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p
          className={`mb-2 px-2 text-xs font-medium uppercase tracking-wide text-gray-400 ${
            !open && 'text-center'
          }`}
        >
          {open ? 'Menu' : '•••'}
        </p>
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  } ${!open && 'justify-center'}`
                }
              >
                <Icon size={19} strokeWidth={2} className="shrink-0" />
                {open && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
