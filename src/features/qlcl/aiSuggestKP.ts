// "Tư vấn AI" cho hành động khắc phục -- KHÔNG gọi mô hình AI thật, đây là bộ
// luật khớp từ khoá cục bộ (port từ 5S_Dashboard_BVTB_v4.html::smartSuggestKP)
// để gợi ý nhanh 1 câu hành động khắc phục mẫu dựa trên mô tả lỗi + nhóm S.
interface Rule {
  kw: string[]
  suggest: string
}

const RULES: Rule[] = [
  { kw: ['vật dụng cá nhân', 'đồ cá nhân', 'để trên đầu giường'], suggest: 'Yêu cầu nhân viên/người nhà cất vật dụng cá nhân đúng nơi quy định, kiểm tra lại trong ca trực.' },
  { kw: ['nhãn', 'dán nhãn', 'chưa dán nhãn'], suggest: 'In và dán nhãn tên/vị trí cho từng mục theo đúng quy định trong ngày hôm nay.' },
  { kw: ['dây', 'dây oxy', 'dây truyền', 'dây điện'], suggest: 'Cố định gọn gàng dây oxy/dây truyền bằng kẹp giữ dây, tránh vướng lối đi.' },
  { kw: ['hết hạn', 'hạn dùng', 'hạn sử dụng'], suggest: 'Kiểm tra và loại bỏ ngay vật tư/thuốc hết hạn; lập sổ theo dõi hạn dùng định kỳ.' },
  { kw: ['sổ', 'sổ theo dõi', 'sổ kiểm tra', 'chưa có sổ'], suggest: 'Thiết lập sổ theo dõi/kiểm tra theo mẫu chuẩn, phân công người ghi chép hàng ngày.' },
  { kw: ['tủ thuốc', 'cấp cứu'], suggest: 'Sắp xếp lại tủ thuốc cấp cứu theo nhóm, dán nhãn vị trí từng loại thuốc rõ ràng.' },
  { kw: ['rác', 'chất thải', 'thùng rác'], suggest: 'Phân loại đúng màu thùng rác theo quy định, thay túi rác đầy ngay trong ca.' },
  { kw: ['vệ sinh', 'bụi', 'bẩn', 'sạch'], suggest: 'Tổng vệ sinh khu vực ngay trong ngày, bổ sung vào lịch vệ sinh định kỳ.' },
  { kw: ['lối đi', 'cản trở', 'chắn lối'], suggest: 'Di dời vật cản khỏi lối đi, đảm bảo hành lang thông thoáng theo quy định PCCC.' },
  { kw: ['biển báo', 'cảnh báo', 'biển chỉ dẫn'], suggest: 'Bổ sung biển báo/biển chỉ dẫn tại vị trí còn thiếu, kiểm tra độ rõ nét.' },
  { kw: ['quy trình', 'sop', 'hướng dẫn'], suggest: 'Xây dựng/cập nhật quy trình (SOP) và tổ chức phổ biến cho 100% nhân viên liên quan.' },
  { kw: ['kiểm tra định kỳ', 'chưa kiểm tra'], suggest: 'Lập lịch kiểm tra định kỳ, phân công người phụ trách và ghi chép kết quả.' },
  { kw: ['ký hiệu', 'mã hóa', 'phân loại'], suggest: 'Bổ sung ký hiệu/mã phân loại theo quy định, đối chiếu với danh mục chuẩn.' },
  { kw: ['hồ sơ', 'bệnh án', 'lưu trữ'], suggest: 'Sắp xếp hồ sơ/bệnh án đúng quy định, bổ sung nhãn năm/số thứ tự để dễ tra cứu.' },
  { kw: ['tay', 'rửa tay', 'sát khuẩn'], suggest: 'Bổ sung dung dịch sát khuẩn tay tại vị trí còn thiếu, kiểm tra hạn dùng.' },
]

const DEFAULTS: Record<string, string> = {
  S1: 'Rà soát và loại bỏ vật dụng không cần thiết, sắp xếp gọn gàng khu vực liên quan.',
  S2: 'Quy định vị trí cố định, dán nhãn rõ ràng theo nguyên tắc "mọi thứ có chỗ, mọi chỗ có vật".',
  S3: 'Phân công vệ sinh khu vực ngay trong ca trực, đưa vào lịch vệ sinh định kỳ.',
  S4: 'Cập nhật quy trình/SOP liên quan, phổ biến cho toàn bộ nhân viên trong khoa.',
  S5: 'Duy trì thực hiện S1–S4, đưa nội dung vào tiêu chí tự kiểm tra hàng tháng.',
}

export function smartSuggestKP(moTaLoi: string, sId: string): string {
  const tc = (moTaLoi || '').toLowerCase()
  for (const rule of RULES) {
    if (rule.kw.some((k) => tc.includes(k))) return rule.suggest
  }
  return DEFAULTS[sId] || 'Thực hiện khắc phục ngay theo hướng dẫn 5S của Phòng QLCL.'
}

// Hạn đề xuất: +7 ngày làm việc kể từ hôm nay (chỉ hiển thị tham khảo, không tự áp vào form)
export function suggestDeadline(from: Date = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 7)
  return d
}
