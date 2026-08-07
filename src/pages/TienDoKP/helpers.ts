import type { KhacPhuc } from "../../features/qlcl/types";
import { TRANG_THAI } from "./constants";
import type { KpForm } from "./types";

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0=CN
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  x.setHours(0, 0, 0, 0);
  return x;
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
// Giờ địa phương -- không dùng toISOString() vì quy đổi UTC dễ lệch ngày (VN = UTC+7)
export const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const fmtVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
export const tuanLabelFromDate = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  const w = Math.ceil(d.getDate() / 7);
  return `Tuần ${w} - ${d.getMonth() + 1}/${d.getFullYear()}`;
};

// Số ngày LÀM VIỆC (bỏ T7/CN) đã trôi qua kể từ ngày phát hiện tới hôm nay
export function workDaysPassed(dateStr: string): number {
  const from = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  const d = new Date(from);
  while (d.getTime() < today.getTime()) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function ttBadge(tt: string, quaHan: boolean) {
  if (tt === "Đã xong")
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (quaHan)
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  if (tt === "Đang xử lý")
    return "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400";
  return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
}

export const isQuaHan = (kp: KhacPhuc) =>
  kp.trang_thai !== "Đã xong" &&
  !!kp.han_xu_ly &&
  kp.han_xu_ly < new Date().toISOString().slice(0, 10);

export function soNgayConLai(hanXuLy: string | null): number | null {
  if (!hanXuLy) return null;
  const han = new Date(`${hanXuLy}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((han.getTime() - today.getTime()) / 86400000);
}

export function emptyForm(): KpForm {
  const today = fmt(new Date());
  return {
    khoa: "",
    vitri: "",
    sId: "S1",
    ngayPhatHien: today,
    moTaLoi: "",
    hanhDong: "",
    nguoi: "",
    han: fmt(addDays(new Date(), 7)),
    tuan: tuanLabelFromDate(today),
    tt: TRANG_THAI[0],
    ghiChu: "",
  };
}
