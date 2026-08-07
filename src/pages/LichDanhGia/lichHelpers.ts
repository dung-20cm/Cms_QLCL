// Hàm thuần (không state/JSX) liên quan riêng tới domain "lịch phân công" --
// tách khỏi hook/component để dễ đọc + có thể test độc lập.
import { isLichSelfReview } from "../../features/qlcl/lichUtils";
import type { LichPhanCong } from "../../features/qlcl/types";
import { addDays, fmt } from "./dateUtils";

// "Loại lịch" (dinh_ky/mot_lan/dot_xuat) giờ suy ra từ TÊN đợt đánh giá đã chọn
// (bảng cấu hình Đợt đánh giá đã có sẵn các đợt tên đúng "Định kỳ"/"Một lần"/
// "Đột xuất") thay vì cho chọn tay 3 option cố định như trước. Đợt nào không
// khớp tên nào ở trên (VD: "Đợt 1 - Quý 3/2026") thì mặc định coi là "mot_lan"
// (1 ngày cụ thể trong đợt, không lặp lại hàng tuần).
export function inferLoaiLichFromTenDot(tenDot: string | undefined): string {
  const t = (tenDot || "").trim().toLowerCase();
  if (t === "định kỳ") return "dinh_ky";
  if (t === "đột xuất") return "dot_xuat";
  return "mot_lan";
}

// groupLich/LichGroup dùng chung từ lichUtils.ts (đã tự nhóm riêng theo LUỒNG
// tự đánh giá/QLCL đánh giá, xem isLichSelfReview + ghi chú ở lichUtils.ts).

export function tenNguoi(l: LichPhanCong) {
  return l.nguoi_thuc_hien?.email || l.nguoi_thuc_hien?.username || "";
}

// Mốc ngày bắt đầu áp dụng thực tế của 1 lịch định kỳ: ưu tiên ngay_thuc_hien
// (ngày bắt đầu do người dùng chọn); nếu chưa có (lịch cũ tạo trước khi có
// trường này) thì dùng NGÀY TẠO bản ghi làm mốc — tránh lặp NGƯỢC về các tuần
// trước khi lịch thực sự tồn tại (VD: lịch tạo 09/07 lại hiện cả tháng 5, 6).
export function effectiveStartDate(l: LichPhanCong): string | null {
  if (l.ngay_thuc_hien) return l.ngay_thuc_hien;
  return l.createdAt ? fmt(new Date(l.createdAt)) : null;
}

// Trải lịch (định kỳ theo thứ / một lần / đột xuất) ra danh sách {lich, date}
// cụ thể trong khoảng [fromStr, toStr] — dùng cho khối "Trưởng phòng theo dõi
// tuân thủ lịch" (cần liệt kê hết các buổi lịch phát sinh trong 1 khoảng ngày,
// khác với lichForDay() chỉ tính cho đúng 1 ngày).
export function expandLichRange(
  items: LichPhanCong[],
  fromStr: string,
  toStr: string,
): Array<{ lich: LichPhanCong; date: string }> {
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T00:00:00`);
  const out: Array<{ lich: LichPhanCong; date: string }> = [];
  for (const l of items) {
    if (l.loai_lich === "dinh_ky") {
      const startBound = effectiveStartDate(l);
      let d = new Date(from);
      while (d <= to) {
        const thu = d.getDay() === 0 ? 7 : d.getDay();
        const dStr = fmt(d);
        if (thu === l.thu_trong_tuan && (!startBound || dStr >= startBound)) {
          out.push({ lich: l, date: dStr });
        }
        d = addDays(d, 1);
      }
    } else if (
      l.ngay_thuc_hien &&
      l.ngay_thuc_hien >= fromStr &&
      l.ngay_thuc_hien <= toStr
    ) {
      out.push({ lich: l, date: l.ngay_thuc_hien });
    }
  }
  return out;
}

// Nhóm các dòng đã trải theo ngày (từ expandLichRange) lại thành 1 dòng/buổi
// lịch — cùng khoa + vị trí + loại + ngày cụ thể thì nhiều cán bộ phụ trách
// gộp chung 1 dòng (khớp cách hiển thị của bảng mẫu), thay vì 1 dòng/người.
export interface TTGroup {
  key: string;
  lich: LichPhanCong;
  date: string;
  items: LichPhanCong[];
}
export function groupTTExpanded(
  expanded: Array<{ lich: LichPhanCong; date: string }>,
): TTGroup[] {
  const map = new Map<string, TTGroup>();
  for (const { lich: l, date } of expanded) {
    // Nhóm riêng theo LUỒNG (tự đánh giá / QLCL đánh giá) -- xem ghi chú ở
    // groupLich (lichUtils.ts): 2 lịch của 2 luồng khác nhau trùng
    // khoa/vị trí/loại/ngày KHÔNG được gộp chung 1 dòng, kẻo lẫn tên người +
    // trạng thái hoàn thành của luồng này sang luồng kia.
    const key = [
      l.khoa_id,
      l.vitri_type_id ?? "x",
      l.loai_lich,
      date,
      isLichSelfReview(l) ? "tu-danh-gia" : "qlcl-danh-gia",
    ].join("|");
    let g = map.get(key);
    if (!g) {
      g = { key, lich: l, date, items: [] };
      map.set(key, g);
    }
    g.items.push(l);
  }
  return Array.from(map.values());
}
