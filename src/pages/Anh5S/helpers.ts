import type { KhacPhuc, PhotoGallery } from "../../features/qlcl/types";
import type { FormState, PhotoGroup } from "./types";

export const todayStr = () => new Date().toISOString().slice(0, 10);

// Tag "ket qua" cua anh gui doc lap -> quy doi % de to mau dong bo voi luot danh gia that
export function pctFromKetQua(kq: string | null): number {
  if (kq === "Đạt tốt") return 95;
  if (kq === "Đạt") return 80;
  return 40;
}

export function emptyForm(defaultNguoiId: number | ""): FormState {
  return {
    khoa_id: "",
    vitri_type_id: "",
    ngay_chup: todayStr(),
    nguoi_gui_id: defaultNguoiId,
    ket_qua: "",
    ghi_chu: "",
    existingPhotos: [],
    newFiles: [],
  };
}

// Nhom anh gui doc lap (khong qua Bang kiem) theo cung 1 luot gui -- vi moi anh la
// 1 dong photo_gallery rieng, cac anh cung 1 luot gui thi trung het cac field mo ta.
export function manualGroupKey(p: PhotoGallery): string {
  return [
    "m",
    p.khoa_id,
    p.vitri_type_id,
    p.ngay_chup,
    p.nguoi_gui_id,
    p.ket_qua,
    p.ghi_chu,
  ].join("|");
}

// Tiêu chí KHÔNG ĐẠT của 1 lượt đánh giá thật -- lấy qua khac_phuc (chỉ tự
// tạo cho tiêu chí ✗ khi lưu Bảng kiểm, xem BangKiem.tsx/danhGia.service.js).
export function failedItemsFor(
  khacPhucRows: KhacPhuc[],
  danhGiaId: number,
): { s: string; tc: string }[] {
  return khacPhucRows
    .filter((k) => k.danh_gia_chi_tiet?.danh_gia_id === danhGiaId)
    .map((k) => ({
      s: k.danh_gia_chi_tiet?.checklist_item?.s_id || "",
      tc: k.danh_gia_chi_tiet?.checklist_item?.tc || "",
    }))
    .filter((f) => f.tc);
}

export const isPassGroup = (g: PhotoGroup) =>
  g.dg ? g.dg.pct >= 70 : g.manual?.ket_qua !== "Chưa đạt";
