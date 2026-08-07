// Hàm thuần (không state/JSX) dùng chung cho các phiếu báo cáo -- màu/nhãn
// theo % đạt, biểu đồ ASCII, định dạng ngày kiểu NĐ30, gộp bảng xếp hạng theo
// khoa, và xuất file .doc. Tách riêng khỏi container/template để test/tái sử
// dụng độc lập, không phải kéo theo JSX.
import { normalizeVn } from "../../components/ui/searchNormalize";
import { isSelfReview } from "../../features/qlcl/lichUtils";
import type { DanhGia } from "../../features/qlcl/types";
import { REPORT_CSS } from "./constants";
import type { KhoaAvgRow, KhoaCompareRow } from "./types";

// "12 tháng 7 năm 2026" — thể thức NĐ30, không dùng dd/mm/yyyy
export function ngayThangNamStr(d: Date = new Date()) {
  return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

// Phân loại + màu riêng cho phiếu báo cáo — khớp ĐÚNG 4 mốc + màu của
// 5S_Dashboard_BVTB_v4 (85/70/60), KHÁC với `xepLoaiFromPct` dùng ở các trang
// khác (90/75/60) — cố tình tách riêng để không ảnh hưởng trang Xu hướng/Tổng hợp.
export function rptColor(pct: number) {
  return pct >= 85
    ? "#1D9E75"
    : pct >= 70
      ? "#185FA5"
      : pct >= 60
        ? "#BA7517"
        : "#A32D2D";
}
export function rptTag(pct: number) {
  return pct >= 85
    ? "Đạt tốt"
    : pct >= 70
      ? "Đạt"
      : pct >= 60
        ? "Chưa đạt"
        : "Không đạt";
}
export function barChart(pct: number) {
  const n = Math.max(0, Math.min(20, Math.round(pct / 5)));
  return "█".repeat(n) + "░".repeat(20 - n);
}

// Gộp danh sách lượt đánh giá thành bảng xếp hạng tỷ lệ đạt TB theo từng đơn
// vị -- dùng chung cho bảng xếp hạng toàn viện (ThangReport) và tách riêng
// theo nguồn (Phòng QLCL đánh giá / khoa tự đánh giá) khi showNguon bật.
export function buildKhoaAvgMap(rows: DanhGia[]): KhoaAvgRow[] {
  const m = new Map<number, { name: string; sum: number; n: number }>();
  for (const r of rows) {
    const cur = m.get(r.khoa_id) || {
      name: r.khoa?.ten_khoa || "",
      sum: 0,
      n: 0,
    };
    cur.sum += r.pct;
    cur.n++;
    m.set(r.khoa_id, cur);
  }
  return [...m.entries()]
    .map(([khoa_id, v]) => ({
      khoa_id,
      khoa: v.name,
      avg: Math.round(v.sum / v.n),
      n: v.n,
    }))
    .sort((a, b) => b.avg - a.avg);
}

// Nhãn nguồn đánh giá 1 lượt: "Phòng QLCL đánh giá" (đi đánh giá khoa khác)
// hay "Khoa/phòng tự đánh giá" (nhân viên khoa tự chấm) -- xem isSelfReview.
export function nguonLabel(r: DanhGia): string {
  return isSelfReview(r) ? "Khoa/phòng tự đánh giá" : "Phòng QLCL đánh giá";
}

// Gộp 2 bảng xếp hạng theo nguồn (Phòng QLCL đánh giá / Khoa tự đánh giá)
// thành 1 danh sách theo khoa -- mỗi khoa 1 dòng, có thể có 1 hoặc cả 2 nguồn.
export function buildKhoaCompareRows(
  qlclRows: KhoaAvgRow[],
  selfRows: KhoaAvgRow[],
): KhoaCompareRow[] {
  const map = new Map<number, KhoaCompareRow>();
  for (const r of qlclRows) {
    map.set(r.khoa_id, { khoa_id: r.khoa_id, khoa: r.khoa, qlcl: r });
  }
  for (const r of selfRows) {
    const cur = map.get(r.khoa_id) || { khoa_id: r.khoa_id, khoa: r.khoa };
    cur.self = r;
    map.set(r.khoa_id, cur);
  }
  // Xếp theo tỷ lệ đạt trung bình chung (gộp cả 2 nguồn nếu có đủ) giảm dần.
  return [...map.values()].sort((a, b) => {
    const avgOf = (r: KhoaCompareRow) => {
      const vals = [r.qlcl?.avg, r.self?.avg].filter(
        (v): v is number => v != null,
      );
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    };
    return avgOf(b) - avgOf(a);
  });
}

// Cộng N ngày LÀM VIỆC (bỏ T7/CN) kể từ 1 ngày -- dùng tính hạn nộp phiếu yêu cầu khắc phục
export function addWorkDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

// Mã đơn vị viết tắt cho số hiệu văn bản (VD "Phòng Tài chính – Kế toán" -> "TCKT") --
// tự suy ra từ TÊN KHOA THỰC TẾ trong CSDL bằng cách bỏ tiền tố Khoa/Phòng/Trung tâm/...
// rồi lấy chữ cái đầu mỗi từ còn lại (đã bỏ dấu). Không dùng bảng tra cứng như file mẫu
// (file mẫu có bảng MA_DON_VI cố định nhưng bị lệch với tên khoa thật trong nhiều trường
// hợp) -- thuật toán này luôn ra kết quả hợp lý với BẤT KỲ tên khoa nào trong hệ thống.
export function maDonVi(ten: string): string {
  const stripped = ten.replace(/^(Khoa|Phòng|Trung tâm|Ban|Khu vực)\s+/i, "");
  const words = normalizeVn(stripped)
    .split(/[\s–-]+/)
    .filter(Boolean);
  const code = words
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return code || "DV";
}

// Xuất vùng xem trước thành file .doc mở được bằng Word — nhúng thẳng cùng 1 khối
// CSS thể thức NĐ30 (REPORT_CSS) như đang dùng để hiển thị/in, giống đúng cơ chế
// "HTML lồng namespace Word" mà 5S_Dashboard_BVTB_v4 dùng — không cần thư viện ngoài.
export function exportWordDoc(node: HTMLElement, filename: string) {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>Báo cáo 5S</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
/* margin:0 -- .pa-wrap tự có padding riêng làm lề trang (15/15/15/25mm, khớp
   ĐÚNG với web preview + bản in). Nếu @page cũng đặt margin thì Word sẽ cộng
   dồn 2 lớp lề (lề trang + padding) khiến nội dung bị thu hẹp/lệch so với
   web -- đây là nguyên nhân file .doc xuất ra không khớp mẫu hiển thị. */
@page { size: 21cm 29.7cm; margin: 0; }
body { margin: 0; }
${REPORT_CSS}
</style>
</head>
<body>${node.innerHTML}</body>
</html>`;
  const blob = new Blob(["﻿", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
