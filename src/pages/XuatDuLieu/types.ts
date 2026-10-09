// 6 bảng dữ liệu cho phép xuất -- key khớp đúng "bang" backend nhận
// (xem server_qlcl/service/xuatDuLieu.service.js, BANG_MAP).
export type BangKey =
  | "tai-khoan"
  | "hanh-dong-kp"
  | "nhom-zalo"
  | "lich-danh-gia"
  | "ket-qua-5s"
  | "anh-5s";

export interface BangColumn {
  header: string;
  key: string;
  width: number;
  // true = giá trị "YYYY-MM-DD"/ISO cần format lại dd/mm/yyyy khi đổ vào Excel
  isDate?: boolean;
  align?: "left" | "center";
}

export interface BangDefinition {
  key: BangKey;
  label: string;
  sheetName: string;
  description: string;
  // Tên file khi CHỈ xuất riêng bảng này (không kèm hậu tố khoảng ngày) --
  // xem useXuatDuLieuData.ts: xuất nhiều bảng cùng lúc dùng tên chung "DuLieu5S".
  fileName: string;
  columns: BangColumn[];
}
