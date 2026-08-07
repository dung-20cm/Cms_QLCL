import type { PhotoGallery } from "../../features/qlcl/types";

// undefined khi them moi; co gia tri khi sua 1 luot gui anh doc lap da co
export interface FormState {
  editKey?: string;
  editIds?: number[];
  // true = anh gan voi 1 luot danh gia that (tu Bang kiem) -- khoa/vi tri/ngay/ket
  // qua khoa (lay tu danh_gia, khong sua duoc qua form nay), chi sua duoc ghi
  // chu + quan ly anh. false/undefined = anh gui doc lap, sua tu do nhu truoc.
  locked?: boolean;
  danhGiaId?: number; // chi co khi locked -- dung lam danh_gia_id khi them anh moi vao dung luot nay
  lockedInfo?: {
    khoa: string;
    vitri: string;
    ngay: string;
    ketQua: string;
    nguoi: string;
  };
  khoa_id: number | "";
  vitri_type_id: number | "";
  ngay_chup: string;
  nguoi_gui_id: number | "";
  ket_qua: string;
  ghi_chu: string;
  existingPhotos: PhotoGallery[]; // anh da luu (chi co khi sua) -- co the xoa bot
  newFiles: File[]; // anh moi chon them (chua upload)
}

// 1 nhom anh cung 1 "luot" -- luot tu Bang kiem (type "eval", gan voi 1 danh_gia
// that) hoac luot gui doc lap (type "manual", gom theo manualGroupKey).
export interface PhotoGroup {
  key: string;
  type: "eval" | "manual";
  dg?: PhotoGallery["danh_gia"];
  manual?: PhotoGallery;
  list: PhotoGallery[];
}
