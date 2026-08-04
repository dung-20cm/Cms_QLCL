import type { DanhGia, Khoa, LichPhanCong } from './types'

// Dùng ngày/tháng/năm THEO GIỜ ĐỊA PHƯƠNG — không dùng toISOString() vì nó quy
// đổi sang UTC, dễ lệch 1 ngày so với lịch thực tế (VN là UTC+7).
export const fmt = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Mốc ngày bắt đầu áp dụng thực tế của 1 lịch định kỳ: ưu tiên ngay_thuc_hien
// (ngày bắt đầu do người dùng chọn); nếu chưa có (lịch cũ tạo trước khi có
// trường này) thì dùng NGÀY TẠO bản ghi làm mốc — tránh lặp NGƯỢC về các tuần
// trước khi lịch thực sự tồn tại.
export function effectiveStartDate(l: LichPhanCong): string | null {
  if (l.ngay_thuc_hien) return l.ngay_thuc_hien
  return l.createdAt ? fmt(new Date(l.createdAt)) : null
}

export function tenNguoi(l: LichPhanCong): string {
  return l.nguoi_thuc_hien?.email || l.nguoi_thuc_hien?.username || ''
}

// Lịch áp dụng cho 1 ngày cụ thể: định kỳ theo thứ (kể từ ngày bắt đầu áp dụng
// trở đi), hoặc một lần/đột xuất đúng ngày.
export function lichForDate(items: LichPhanCong[], dateStr: string): LichPhanCong[] {
  const d = new Date(`${dateStr}T00:00:00`)
  const thu = d.getDay() === 0 ? 7 : d.getDay()
  return items.filter((l) => {
    if (l.loai_lich === 'dinh_ky') {
      if (l.thu_trong_tuan !== thu) return false
      const startBound = effectiveStartDate(l)
      if (startBound && dateStr < startBound) return false
      return true
    }
    return l.ngay_thuc_hien === dateStr
  })
}

// Người đánh giá của 1 lượt đánh giá có khớp đúng cán bộ được PHÂN CÔNG trong
// lịch hay không (người đánh giá chính, hoặc có mặt trong danh sách đồng đánh
// giá). Đây là điều kiện BẮT BUỘC để coi 1 lịch là "đã hoàn thành" -- thiếu
// điều kiện này thì 2 lịch khác nhau (VD lịch Phòng QLCL đi đánh giá 1 khoa
// khác VS lịch khoa đó tự đánh giá) chỉ cần trùng khoa/vị trí/ngày là đã bị
// tính nhầm "hoàn thành" lẫn của nhau, dù là 2 cán bộ hoàn toàn khác nhau thực
// hiện -- đây chính là lỗi "ghi nhận trùng thông tin 2 luồng" đã gặp phải.
function isNguoiKhopLich(dg: DanhGia, nguoiThucHienId: number): boolean {
  if (dg.nguoi_danh_gia_id === nguoiThucHienId) return true
  return (dg.dong_danh_gia_ids || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .includes(nguoiThucHienId)
}

// Đã có kết quả đánh giá (bảng kiểm) khớp khoa + vị trí + ngày + ĐÚNG cán bộ
// được phân công trong lịch → coi là đã hoàn thành.
export function isLichDone(danhGiaList: DanhGia[], l: LichPhanCong, dateStr: string): boolean {
  return danhGiaList.some(
    (dg) =>
      dg.khoa_id === l.khoa_id &&
      dg.ngay_danh_gia === dateStr &&
      (!l.vitri_type_id || dg.vitri_type_id === l.vitri_type_id) &&
      isNguoiKhopLich(dg, l.nguoi_thuc_hien_id),
  )
}

// Nhóm các dòng LichPhanCong (1 dòng = 1 người) thuộc cùng 1 buổi lịch (cùng
// khoa + vị trí + loại + thứ/ngày) lại thành 1 thẻ hiển thị nhiều người.
export interface LichGroup {
  key: string
  khoa?: LichPhanCong['khoa']
  vitri_type?: LichPhanCong['vitri_type']
  loai_lich: string
  ghiChu: string | null
  items: LichPhanCong[]
}

// Bỏ dấu tiếng Việt + về chữ thường -- dùng để so khớp TÊN khoa không phụ
// thuộc cách gõ dấu (VD tra "Phòng Quản lý chất lượng" trong danh mục khoa).
export function boDauVN(str: string): string {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

// Tìm id của khoa "Phòng Quản lý chất lượng" theo TÊN trong danh mục khoa
// (không hardcode id vì có thể khác nhau giữa các môi trường dữ liệu).
export function findKhoaQlclId(khoaList: Khoa[]): number | undefined {
  return khoaList.find((k) => boDauVN(k.ten_khoa).includes('quan ly chat luong'))?.id
}

// 1 lượt đánh giá là "khoa tự đánh giá" nếu người đánh giá thuộc CHÍNH khoa
// đang được đánh giá; ngược lại là "Phòng QLCL đi đánh giá khoa khác" (2 luồng
// đánh giá độc lập -- xem thêm ghi chú ở BangKiem.tsx cùng đợt fix ownership).
export function isSelfReview(r: DanhGia): boolean {
  return r.nguoi_danh_gia?.khoa_id === r.khoa_id
}

export function isQlclAudit(r: DanhGia): boolean {
  return !isSelfReview(r)
}

// Tương tự isSelfReview nhưng cho 1 dòng LỊCH (LichPhanCong) -- cán bộ phụ
// trách thuộc CHÍNH khoa được phân công lịch => luồng "khoa tự đánh giá",
// khác khoa => luồng "Phòng QLCL đi đánh giá khoa khác".
export function isLichSelfReview(l: LichPhanCong): boolean {
  return l.nguoi_thuc_hien?.khoa_id === l.khoa_id
}

// Nhóm các dòng LichPhanCong (1 dòng = 1 người) thuộc cùng 1 buổi lịch (cùng
// khoa + vị trí + loại + thứ/ngày) lại thành 1 thẻ hiển thị nhiều người --
// BẮT BUỘC nhóm riêng theo LUỒNG (tự đánh giá / QLCL đánh giá) dù trùng hết
// khoa+vị trí+loại+ngày, nếu không 2 lịch của 2 luồng khác nhau (VD lịch
// Phòng QLCL giao cho cán bộ QLCL đi đánh giá 1 khoa, VÀ lịch khoa đó tự giao
// cho nhân viên mình tự đánh giá, cùng vị trí/ngày) sẽ bị gộp nhầm chung 1 thẻ,
// hiển thị lẫn tên người + trạng thái hoàn thành của luồng này sang luồng kia.
export function groupLich(items: LichPhanCong[]): LichGroup[] {
  const map = new Map<string, LichGroup>()
  for (const l of items) {
    const key = [
      l.khoa_id,
      l.vitri_type_id ?? 'x',
      l.loai_lich,
      l.thu_trong_tuan ?? 'x',
      l.ngay_thuc_hien ?? 'x',
      isLichSelfReview(l) ? 'tu-danh-gia' : 'qlcl-danh-gia',
    ].join('|')
    let g = map.get(key)
    if (!g) {
      g = {
        key,
        khoa: l.khoa,
        vitri_type: l.vitri_type,
        loai_lich: l.loai_lich,
        ghiChu: null,
        items: [],
      }
      map.set(key, g)
    }
    g.items.push(l)
    if (!g.ghiChu && l.ghi_chu) g.ghiChu = l.ghi_chu
  }
  return Array.from(map.values())
}

// 1 LichGroup (có thể gồm nhiều người CÙNG luồng cùng phụ trách 1 buổi) được
// coi là "đã hoàn thành" nếu BẤT KỲ người nào trong nhóm đã nộp đánh giá khớp
// đúng lịch -- không chỉ kiểm tra người đầu tiên (items[0]) như trước (từng
// khiến 1 nhóm gồm nhiều lịch của nhiều luồng bị hiểu sai trạng thái).
export function isGroupDone(danhGiaList: DanhGia[], group: LichGroup, dateStr: string): boolean {
  return group.items.some((l) => isLichDone(danhGiaList, l, dateStr))
}
