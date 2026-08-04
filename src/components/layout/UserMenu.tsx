import { useEffect, useRef, useState } from "react";
import { KeyRound, LogOut, ChevronDown, TriangleAlert } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { Modal, btnSecondary, btnDanger } from "../ui/PageShell";
import ChangePasswordModal from "./ChangePasswordModal";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] || "";
  return last.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {user ? getInitials(user.username) : ".."}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user?.username ?? "Đang tải..."}
          </p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
        <ChevronDown
          size={16}
          className={`hidden text-gray-400 transition-transform duration-200 sm:block ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="animate-dropdown-in absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setPwModalOpen(true);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <KeyRound size={16} className="text-gray-400" />
            Đổi mật khẩu
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              setLogoutConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      )}

      <ChangePasswordModal
        open={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
      />

      <Modal
        open={logoutConfirmOpen}
        title="Xác nhận đăng xuất"
        onClose={() => setLogoutConfirmOpen(false)}
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setLogoutConfirmOpen(false)}
            >
              Huỷ
            </button>
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                setLogoutConfirmOpen(false);
                dispatch(logout());
              }}
            >
              Đăng xuất
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10">
            <TriangleAlert size={20} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Bạn có chắc muốn đăng xuất khỏi tài khoản{" "}
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {user?.email || user?.username}
            </span>
            ?
          </p>
        </div>
      </Modal>
    </div>
  );
}
