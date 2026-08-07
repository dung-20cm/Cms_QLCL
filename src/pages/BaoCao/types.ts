// Kiểu dữ liệu dùng chung trong toàn bộ trang Báo cáo (container + hook +
// helper + các template phiếu) -- tách riêng để mọi file khác chỉ cần import
// đúng phần type cần, không phải kéo theo logic/JSX không liên quan.

export type RptType = "luot" | "thang" | "donvi" | "dot" | "guikhoa";

// Gộp danh sách lượt đánh giá thành bảng xếp hạng tỷ lệ đạt TB theo từng đơn
// vị -- dùng chung cho bảng xếp hạng toàn viện (ThangReport) và tách riêng
// theo nguồn (Phòng QLCL đánh giá / khoa tự đánh giá) khi showNguon bật.
export interface KhoaAvgRow {
  khoa_id: number;
  khoa: string;
  avg: number;
  n: number;
}

export interface KhoaCompareRow {
  khoa_id: number;
  khoa: string;
  qlcl?: KhoaAvgRow;
  self?: KhoaAvgRow;
}
