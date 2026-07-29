import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { clearAuthError, loginUser } from "../features/auth/authSlice";

interface LocationState {
  from?: string;
}

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const isSubmitting = status === "loading";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = (location.state as LocationState | null)?.from || "/";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    dispatch(loginUser({ username: username.trim(), password, remember }));
  }

  return (
    <div className="flex min-h-screen animate-fade-in bg-white dark:bg-gray-950">
      {/* Cột form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          {/* <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              5S
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Bộ công cụ đánh giá 5S
              </p>
              <p className="text-xs text-gray-400">
                Bệnh viện Đa khoa Thái Bình
              </p>
            </div>
          </div> */}

          <h1 className="text-2xl text-center font-semibold text-gray-800 dark:text-white">
            Đăng nhập
          </h1>
          <p className="mt-2 text-center text-xs text-gray-400">
            Nhập tên đăng nhập và mật khẩu để vào
          </p>
          <p className="mt-2 text-center text-xs text-gray-400">
            hệ thống quản lý chất lượng 5S.
          </p>
          {/* <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Nhập tên đăng nhập và mật khẩu để vào
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            hệ thống quản lý chất lượng 5S.
          </p> */}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:ring-brand-900/40"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:ring-brand-900/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300 dark:border-gray-600 dark:bg-gray-800"
                />
                Ghi nhớ đăng nhập
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Chưa có tài khoản? Liên hệ trưởng khoa hoặc phòng quản lý chất lương
            để được cấp tài khoản.
          </p>
        </div>
      </div>

      {/* Cột thương hiệu */}
      <div className="relative hidden overflow-hidden bg-[#1B3A5C] lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <img
            src="/logobenhvien.png"
            alt="Bệnh viện Đa khoa Thái Bình"
            className="mb-6 h-28 w-28 object-contain drop-shadow-lg"
          />
          <h2 className="text-2xl font-semibold text-white">
            Bộ công cụ đánh giá điện tử 5S
          </h2>
          <p className="mt-3 max-w-sm text-sm text-white/60">
            Bệnh viện Đa khoa Thái Bình — Phòng Quản lý Chất lượng Theo dõi lịch
            đánh giá, xu hướng và tiến độ khắc phục 5S
          </p>
        </div>
      </div>
    </div>
  );
}
