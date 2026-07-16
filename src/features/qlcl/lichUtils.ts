import type { DanhGia, LichPhanCong } from './types'

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

// Đã có kết quả đánh giá (bảng kiểm) khớp khoa + vị trí + ngày → coi là đã hoàn thành
export function isLichDone(danhGiaList: DanhGia[], l: LichPhanCong, dateStr: string): boolean {
  return danhGiaList.some(
    (dg) =>
      dg.khoa_id === l.khoa_id &&
      dg.ngay_danh_gia === dateStr &&
      (!l.vitri_type_id || dg.vitri_type_id === l.vitri_type_id),
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

export function groupLich(items: LichPhanCong[]): LichGroup[] {
  const map = new Map<string, LichGroup>()
  for (const l of items) {
    const key = [
      l.khoa_id,
      l.vitri_type_id ?? 'x',
      l.loai_lich,
      l.thu_trong_tuan ?? 'x',
      l.ngay_thuc_hien ?? 'x',
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
