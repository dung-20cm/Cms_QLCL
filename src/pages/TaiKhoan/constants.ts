import type { FormState } from "./types";

// Role mà Trưởng khoa KHÔNG được phép gán (khớp assertRoleAllowedForScopedManager ở backend)
export const ROLE_SLUGS_ONLY_ADMIN_CAN_ASSIGN = ["admin", "phong-qlcl", "lanhdao"];

export const roleBadge: Record<string, string> = {
  admin:
    "bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20",
  "phong-qlcl":
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
  "truong-khoa":
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  "nhan-vien":
    "bg-gray-100 text-gray-600 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:ring-gray-500/20",
  lanhdao:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
};

export const emptyForm: FormState = {
  username: "",
  password: "",
  email: "",
  mobile: "",
  khoa_id: "",
  role_id: "",
  status: 1,
};
