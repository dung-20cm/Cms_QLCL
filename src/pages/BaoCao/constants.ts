export const S_META: Record<string, { name: string; color: string }> = {
  S1: { name: "Sàng lọc", color: "#D85A30" },
  S2: { name: "Sắp xếp", color: "#BA7517" },
  S3: { name: "Sạch sẽ", color: "#1D9E75" },
  S4: { name: "Săn sóc", color: "#185FA5" },
  S5: { name: "Sẵn sàng", color: "#534AB7" },
};
export const S_IDS = ["S1", "S2", "S3", "S4", "S5"];

// Địa danh dùng trong thể thức văn bản NĐ30 — khớp quốc hiệu "SỞ Y TẾ TỈNH HƯNG YÊN"
// (Bệnh viện Đa khoa Thái Bình đặt tại tỉnh Hưng Yên).
export const DIA_DANH = "Hưng Yên";

// CSS thể thức NĐ30 — dịch nguyên từ khối `.pa-*` trong 5S_Dashboard_BVTB_v4.html
// (dùng chung cho cả preview trên web LẪN file .doc xuất ra, để không lệch định
// dạng giữa 2 nơi — khác bản trước đây dùng class Tailwind, Word không đọc được).
export const REPORT_CSS = `
.pa-wrap{font-family:'Times New Roman',Times,serif;font-size:13pt;color:#000;background:#fff;padding:15mm 15mm 15mm 25mm;line-height:1.5;max-width:210mm;margin:0 auto;box-sizing:border-box}
/* Word (mở .doc qua engine riêng, không phải trình duyệt) không cascade
   font-family từ div cha (.pa-wrap) xuống bên trong <table> một cách đáng
   tin cậy -- chữ trong mọi bảng bị rơi về font mặc định của Word (thường là
   Calibri) nếu không khai báo lại tường minh. Khai báo lại ở đây cho MỌI
   bảng/ô trong phiếu để khớp đúng Times New Roman như web hiển thị. */
.pa-wrap table,.pa-wrap td,.pa-wrap th{font-family:'Times New Roman',Times,serif}
/* table-layout:fixed + mso-padding-alt:0 -- Word tự áp lề trong ô (~2mm mỗi
   phía) và có thể auto-size cột 50/50 theo nội dung thay vì đúng theo CSS
   width nếu không khoá layout cứng -- 2 việc này khiến cột phải bị hẹp hơn
   85mm tính toán trên web, làm chữ vẫn xuống dòng dù đã giảm cỡ chữ. */
.pa-nd30-header{width:100%;table-layout:fixed;border-collapse:collapse;border:none;margin-bottom:4mm}
.pa-nd30-header td{border:none;padding:0;width:50%;vertical-align:top;text-align:center;mso-padding-alt:0mm 0mm 0mm 0mm}
.pa-nd30-coquan{font-size:12pt;font-weight:bold;text-transform:uppercase;line-height:1.3}
.pa-nd30-ten{font-size:12pt;font-weight:bold;text-transform:uppercase;line-height:1.3}
.pa-nd30-gach{width:40%;height:0;border-bottom:1.5pt solid #000;margin:2mm auto 0}
/* 9pt -- 10pt vẫn còn xuống dòng khi mở bằng Word thật (Word tính bề rộng ô
   hẹp hơn ước lượng trên web), giảm thêm 1 nấc cho chắc chắn vừa 1 dòng. */
.pa-nd30-quochieu{font-size:9pt;font-weight:bold;text-transform:uppercase}
.pa-nd30-tieungu{font-size:13pt;font-weight:bold;text-decoration:underline}
.pa-nd30-sohieu{width:100%;table-layout:fixed;border-collapse:collapse;border:none;margin:3mm 0 0}
.pa-nd30-sohieu td{border:none;padding:0;width:50%;text-align:center;font-size:12pt;mso-padding-alt:0mm 0mm 0mm 0mm}
.pa-nd30-ngay{font-style:italic}
.pa-nd30-tenloai{text-align:center;font-size:14pt;font-weight:bold;text-transform:uppercase;margin:6mm 0 0}
.pa-nd30-trichyeu{text-align:center;font-size:13pt;font-weight:bold;margin:1mm 0 6mm}
.pa-muc{font-weight:bold;font-size:13pt;margin:5mm 0 2mm;text-transform:uppercase}
.pa-dieu{font-weight:bold;font-size:13pt;margin:4mm 0 1mm 10mm}
.pa-nd{font-size:13pt;margin:1mm 0 1mm 10mm;text-align:justify}
.pa-bangket{width:100%;border-collapse:collapse;font-size:12pt;margin:3mm 0}
.pa-bangket th{background:#1B3A5C;color:#fff;padding:4pt 6pt;text-align:center;border:1pt solid #888;font-size:11pt}
.pa-bangket td{padding:4pt 6pt;border:1pt solid #bbb;font-size:11pt}
.pa-bangket tr:nth-child(even) td{background:#f9f9f9}
.pa-bar{font-family:'Courier New',monospace;font-size:9pt;letter-spacing:-1px}
.pa-ket-box{border:1.5pt solid #000;padding:4mm 6mm;margin:4mm 0;text-align:center}
.pa-ket-diem{font-size:28pt;font-weight:bold;line-height:1}
.pa-ket-loai{font-size:13pt;font-weight:bold;margin-top:1mm}
.pa-ket-detail{font-size:11pt;color:#444;margin-top:1mm}
.pa-footer-tbl{width:100%;table-layout:fixed;border-collapse:collapse;border:none;margin-top:8mm}
.pa-footer-tbl td{border:none;padding:0;vertical-align:top;mso-padding-alt:0mm 0mm 0mm 0mm}
.pa-noinha{width:45%;font-size:11pt}
.pa-noinha-title{font-weight:bold;font-size:12pt}
.pa-kyte{width:55%;text-align:center}
.pa-kyte-chucvu{font-weight:bold;font-size:13pt;text-transform:uppercase}
.pa-kyte-note{font-style:italic;font-size:11pt}
.pa-kyte-ten{font-weight:bold;font-size:13pt;margin-top:25mm}
.pa-divider{border:none;border-top:0.5pt solid #aaa;margin:4mm 0}
.pa-footer-note{font-size:9pt;color:#888;margin-top:6mm;text-align:center;font-style:italic}
`;
