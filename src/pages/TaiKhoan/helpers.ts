import type { Khoa } from "../../features/qlcl/types";
import type { FormErrors, FormState } from "./types";

// Bỏ dấu tiếng Việt (kể cả đ/Đ không tự tách dấu qua NFD)
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Gợi ý tên đăng nhập từ họ tên: tên chính (từ cuối) + ký tự đầu các từ trước đó
// VD: "Phan Thu Phương" -> "phuongpt" ; "Lương Thị Mai Anh" -> "anhltm"
export function suggestUsername(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const ten = removeVietnameseTones(words[words.length - 1]).toLowerCase();
  const initials = words
    .slice(0, -1)
    .map((w) => removeVietnameseTones(w).toLowerCase().charAt(0))
    .join("");
  return `${ten}${initials}`.replace(/[^a-z0-9]/g, "");
}

// Ký tự viết tắt khoa/phòng (chữ cái đầu mỗi từ) để làm hậu tố tên đăng nhập
// VD: "Phòng Công nghệ thông tin" -> "pcntt"
export function suggestKhoaSuffix(tenKhoa: string): string {
  return tenKhoa
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => removeVietnameseTones(w).toLowerCase().charAt(0))
    .join("")
    .replace(/[^a-z0-9]/g, "");
}

// Tên đăng nhập gợi ý = họ tên + hậu tố khoa/phòng (nếu đã chọn khoa)
// VD: "Phan Thu Phương" + "Phòng Công nghệ thông tin" -> "phuongpt-pcntt"
export function buildUsername(
  hoTen: string,
  khoaId: number | "",
  khoaList: Khoa[],
): string {
  const base = suggestUsername(hoTen);
  const khoa = khoaId === "" ? undefined : khoaList.find((k) => k.id === khoaId);
  if (!base || !khoa) return base;
  const suffix = suggestKhoaSuffix(khoa.ten_khoa);
  return suffix ? `${base}-${suffix}` : base;
}

// Validate các trường bắt buộc — không cho để trống
export function validateForm(f: FormState): FormErrors {
  const errs: FormErrors = {};
  if (!f.email.trim()) errs.email = "Vui lòng nhập họ và tên";
  if (!f.username.trim()) errs.username = "Vui lòng nhập tên đăng nhập";
  if (!f.id && !f.password.trim())
    errs.password = "Vui lòng nhập mật khẩu cho tài khoản mới";
  if (f.khoa_id === "") errs.khoa_id = "Vui lòng chọn khoa/phòng";
  if (f.role_id === "") errs.role_id = "Vui lòng chọn quyền (role)";
  return errs;
}
