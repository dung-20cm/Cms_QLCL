import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  ClipboardList,
  CalendarDays,
  ImageIcon,
  Camera,
  Table2,
  TrendingUp,
  Wrench,
  Printer,
  Settings,
  Users,
  ChevronDown,
  Building2,
  MapPin,
  CalendarRange,
  ListChecks,
} from "lucide-react";
import { useAppSelector } from "../../app/hooks";
import {
  PERM_XEM_TONG_HOP,
  PERM_DANH_GIA,
  PERM_XEM_LICH,
  PERM_XEM_ANH_5S,
  PERM_XEM_TIEN_DO_KP,
  PERM_CAU_HINH,
  PERM_QUAN_LY_TAI_KHOAN,
} from "../../features/auth/permissions";
import type { PermissionSlug } from "../../features/auth/permissions";

interface NavChild {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
}

interface NavItem {
  to?: string;
  label: string;
  icon: typeof LayoutGrid;
  // Hiện menu nếu user có ít nhất 1 quyền trong danh sách (anyOf) — theo sơ đồ map.jpg
  permission?: readonly PermissionSlug[];
  // Menu cha có tab con (VD: Cấu hình)
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    to: "/",
    label: "Thống kê",
    icon: LayoutGrid,
    permission: PERM_XEM_TONG_HOP,
  },
  {
    to: "/bang-kiem",
    label: "Bảng kiểm",
    icon: ClipboardList,
    permission: PERM_DANH_GIA,
  },
  {
    to: "/lich-danh-gia",
    label: "Lịch đánh giá",
    icon: CalendarDays,
    permission: PERM_XEM_LICH,
  },
  {
    to: "/zalo-5s",
    label: "Nhóm Zalo 5S",
    icon: ImageIcon,
    permission: PERM_XEM_ANH_5S,
  },
  { to: "/anh-5s", label: "Ảnh 5S", icon: Camera, permission: PERM_XEM_ANH_5S },
  {
    to: "/tong-hop",
    label: "Tổng hợp",
    icon: Table2,
    permission: PERM_XEM_TONG_HOP,
  },
  {
    to: "/xu-huong",
    label: "Xu hướng",
    icon: TrendingUp,
    permission: PERM_XEM_TONG_HOP,
  },
  {
    to: "/tien-do-kp",
    label: "Tiến độ KP",
    icon: Wrench,
    permission: PERM_XEM_TIEN_DO_KP,
  },
  {
    to: "/bao-cao",
    label: "Báo cáo",
    icon: Printer,
    permission: PERM_XEM_TONG_HOP,
  },
  {
    to: "/tai-khoan",
    label: "Tài khoản",
    icon: Users,
    permission: PERM_QUAN_LY_TAI_KHOAN,
  },
  {
    label: "Cấu hình",
    icon: Settings,
    permission: PERM_CAU_HINH,
    children: [
      { to: "/cau-hinh/khoa-vitri", label: "Khoa – vị trí", icon: Building2 },
      { to: "/cau-hinh/vi-tri", label: "Vị trí đánh giá", icon: MapPin },
      {
        to: "/cau-hinh/dot-danh-gia",
        label: "Đợt đánh giá",
        icon: CalendarRange,
      },
      { to: "/cau-hinh/tieu-chi", label: "Tiêu chí", icon: ListChecks },
    ],
  },
];

const linkCls = (isActive: boolean, open: boolean) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
    isActive
      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
      : "text-gray-600 hover:translate-x-0.5 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
  } ${!open ? "justify-center" : ""}`;

export default function Sidebar() {
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const permissions = useAppSelector((s) => s.auth.permissions);
  const location = useLocation();
  // Nhóm Cấu hình tự mở khi đang ở route con của nó
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "Cấu hình": location.pathname.startsWith("/cau-hinh"),
  });

  const visibleItems = navItems.filter(
    (item) =>
      !item.permission ||
      permissions.some((p) =>
        (item.permission as readonly string[]).includes(p.slug),
      ),
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 ${
        open ? "w-64" : "w-[84px]"
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5 dark:border-gray-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
          5S
        </div>
        {open && (
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Bộ công cụ đánh giá 5S
            </p>
            <p className="text-xs text-gray-400">Bệnh viện Đa khoa Thái Bình</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p
          className={`mb-2 px-2 text-xs font-medium uppercase tracking-wide text-gray-400 ${
            !open && "text-center"
          }`}
        >
          {open ? "Menu" : "•••"}
        </p>
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            // ── Menu cha có tab con (Cấu hình) ──
            if (item.children) {
              const childActive = item.children.some((c) =>
                location.pathname.startsWith(c.to),
              );
              const isExpanded = (expanded[item.label] ?? false) || childActive;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [item.label]: !isExpanded }))
                    }
                    className={`w-full ${linkCls(childActive, open)}`}
                  >
                    <Icon size={19} strokeWidth={2} className="shrink-0" />
                    {open && (
                      <>
                        <span className="flex-1 truncate text-left">
                          {item.label}
                        </span>
                        <ChevronDown
                          size={15}
                          className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>
                  {isExpanded && open && (
                    <ul className="animate-slide-down mt-1 space-y-0.5 border-l border-gray-100 pl-4 ml-5 dark:border-gray-800">
                      {item.children.map((c) => {
                        const CIcon = c.icon;
                        return (
                          <li key={c.to}>
                            <NavLink
                              to={c.to}
                              className={({ isActive }) =>
                                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                                  isActive
                                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                                    : "text-gray-500 hover:translate-x-0.5 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                }`
                              }
                            >
                              <CIcon
                                size={15}
                                strokeWidth={2}
                                className="shrink-0"
                              />
                              <span className="truncate">{c.label}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // ── Menu thường ──
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to!}
                  end={item.to === "/"}
                  className={({ isActive }) => linkCls(isActive, open)}
                >
                  <Icon size={19} strokeWidth={2} className="shrink-0" />
                  {open && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
