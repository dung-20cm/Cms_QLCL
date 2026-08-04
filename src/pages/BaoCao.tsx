import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Printer, FileDown } from "lucide-react";
import {
  PageHeader,
  KpiCard,
  Field,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
  useDanhGia,
  useKhacPhuc,
} from "../components/ui/PageShell";
import SearchableSelect from "../components/ui/SearchableSelect";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loadDanhGia } from "../features/qlcl/danhGiaSlice";
import { loadKhacPhuc } from "../features/qlcl/khacPhucSlice";
import { smartSuggestKP } from "../features/qlcl/aiSuggestKP";
import { normalizeVn } from "../components/ui/searchNormalize";
import { fetchDotDanhGiaList } from "../features/qlcl/api";
import { isSelfReview, isQlclAudit } from "../features/qlcl/lichUtils";
import type { DanhGia, DotDanhGia, KhacPhuc } from "../features/qlcl/types";
import { PERMISSION } from "../features/auth/permissions";
import { useHasPermission } from "../features/auth/usePermission";

type RptType = "luot" | "thang" | "donvi" | "dot" | "guikhoa";

const S_META: Record<string, { name: string; color: string }> = {
  S1: { name: "Sàng lọc", color: "#D85A30" },
  S2: { name: "Sắp xếp", color: "#BA7517" },
  S3: { name: "Sạch sẽ", color: "#1D9E75" },
  S4: { name: "Săn sóc", color: "#185FA5" },
  S5: { name: "Sẵn sàng", color: "#534AB7" },
};
const S_IDS = ["S1", "S2", "S3", "S4", "S5"];

// Địa danh dùng trong thể thức văn bản NĐ30 — khớp quốc hiệu "SỞ Y TẾ TỈNH HƯNG YÊN"
// (Bệnh viện Đa khoa Thái Bình đặt tại tỉnh Hưng Yên).
const DIA_DANH = "Hưng Yên";

// "12 tháng 7 năm 2026" — thể thức NĐ30, không dùng dd/mm/yyyy
function ngayThangNamStr(d: Date = new Date()) {
  return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

// Phân loại + màu riêng cho phiếu báo cáo — khớp ĐÚNG 4 mốc + màu của
// 5S_Dashboard_BVTB_v4 (85/70/60), KHÁC với `xepLoaiFromPct` dùng ở các trang
// khác (90/75/60) — cố tình tách riêng để không ảnh hưởng trang Xu hướng/Tổng hợp.
function rptColor(pct: number) {
  return pct >= 85
    ? "#1D9E75"
    : pct >= 70
      ? "#185FA5"
      : pct >= 60
        ? "#BA7517"
        : "#A32D2D";
}
function rptTag(pct: number) {
  return pct >= 85
    ? "Đạt tốt"
    : pct >= 70
      ? "Đạt"
      : pct >= 60
        ? "Chưa đạt"
        : "Không đạt";
}
function barChart(pct: number) {
  const n = Math.max(0, Math.min(20, Math.round(pct / 5)));
  return "█".repeat(n) + "░".repeat(20 - n);
}

// Gộp danh sách lượt đánh giá thành bảng xếp hạng tỷ lệ đạt TB theo từng đơn
// vị -- dùng chung cho bảng xếp hạng toàn viện (ThangReport) và tách riêng
// theo nguồn (Phòng QLCL đánh giá / khoa tự đánh giá) khi showNguon bật.
function buildKhoaAvgMap(rows: DanhGia[]) {
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

type KhoaAvgRow = ReturnType<typeof buildKhoaAvgMap>[number];

// Bảng xếp hạng theo đơn vị dùng chung -- tái sử dụng cho bảng gộp lẫn 2 bảng
// tách theo nguồn đánh giá.
function KhoaRankTable({ rows }: { rows: KhoaAvgRow[] }) {
  return (
    <table className="pa-bangket">
      <thead>
        <tr>
          <th style={{ width: "6%" }}>Hạng</th>
          <th>Đơn vị</th>
          <th style={{ width: "12%" }}>Số lượt</th>
          <th style={{ width: "15%" }}>Tỷ lệ đạt</th>
          <th style={{ width: "18%" }}>Xếp loại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((k, i) => {
          const c = rptColor(k.avg);
          return (
            <tr key={k.khoa_id}>
              <td style={{ textAlign: "center", fontWeight: "bold" }}>
                {i + 1}
              </td>
              <td>{k.khoa}</td>
              <td style={{ textAlign: "center" }}>{k.n}</td>
              <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
                {k.avg}%
              </td>
              <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
                {rptTag(k.avg)}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={5}
              style={{ textAlign: "center", fontStyle: "italic" }}
            >
              Không có lượt đánh giá nào trong kỳ
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Nhãn nguồn đánh giá 1 lượt: "Phòng QLCL đánh giá" (đi đánh giá khoa khác)
// hay "Khoa/phòng tự đánh giá" (nhân viên khoa tự chấm) -- xem isSelfReview.
function nguonLabel(r: DanhGia): string {
  return isSelfReview(r) ? "Khoa/phòng tự đánh giá" : "Phòng QLCL đánh giá";
}

interface KhoaCompareRow {
  khoa_id: number;
  khoa: string;
  qlcl?: KhoaAvgRow;
  self?: KhoaAvgRow;
}

// Gộp 2 bảng xếp hạng theo nguồn (Phòng QLCL đánh giá / Khoa tự đánh giá)
// thành 1 danh sách theo khoa -- mỗi khoa 1 dòng, có thể có 1 hoặc cả 2 nguồn.
function buildKhoaCompareRows(
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

// 1 bảng duy nhất so sánh 2 luồng đánh giá theo TỪNG khoa -- mỗi khoa 1 dòng,
// tách 2 nhóm cột dọc (Phòng QLCL đánh giá | Khoa/phòng tự đánh giá) thay vì
// 2 bảng riêng biệt, dễ đối chiếu trực quan hơn.
function KhoaCompareTable({ rows }: { rows: KhoaCompareRow[] }) {
  const cell = (v: KhoaAvgRow | undefined) => {
    if (!v) {
      return (
        <td
          colSpan={3}
          style={{ textAlign: "center", fontStyle: "italic", color: "#999" }}
        >
          — Chưa có dữ liệu —
        </td>
      );
    }
    const c = rptColor(v.avg);
    return (
      <>
        <td style={{ textAlign: "center" }}>{v.n}</td>
        <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
          {v.avg}%
        </td>
        <td style={{ fontWeight: "bold", color: c, textAlign: "center" }}>
          {rptTag(v.avg)}
        </td>
      </>
    );
  };
  return (
    <table className="pa-bangket">
      <thead>
        <tr>
          <th rowSpan={2} style={{ width: "5%" }}>
            Hạng
          </th>
          <th rowSpan={2}>Đơn vị</th>
          <th colSpan={3} style={{ textAlign: "center" }}>
            Phòng QLCL đánh giá
          </th>
          <th colSpan={3} style={{ textAlign: "center" }}>
            Khoa/phòng tự đánh giá
          </th>
        </tr>
        <tr>
          <th style={{ width: "8%" }}>Lượt</th>
          <th style={{ width: "10%" }}>Tỷ lệ đạt</th>
          <th style={{ width: "12%" }}>Xếp loại</th>
          <th style={{ width: "8%" }}>Lượt</th>
          <th style={{ width: "10%" }}>Tỷ lệ đạt</th>
          <th style={{ width: "12%" }}>Xếp loại</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.khoa_id}>
            <td style={{ textAlign: "center", fontWeight: "bold" }}>
              {i + 1}
            </td>
            <td>{r.khoa}</td>
            {cell(r.qlcl)}
            {cell(r.self)}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={8}
              style={{ textAlign: "center", fontStyle: "italic" }}
            >
              Không có lượt đánh giá nào trong kỳ
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// Cộng N ngày LÀM VIỆC (bỏ T7/CN) kể từ 1 ngày -- dùng tính hạn nộp phiếu yêu cầu khắc phục
function addWorkDays(from: Date, days: number): Date {
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
function maDonVi(ten: string): string {
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

// CSS thể thức NĐ30 — dịch nguyên từ khối `.pa-*` trong 5S_Dashboard_BVTB_v4.html
// (dùng chung cho cả preview trên web LẪN file .doc xuất ra, để không lệch định
// dạng giữa 2 nơi — khác bản trước đây dùng class Tailwind, Word không đọc được).
const REPORT_CSS = `
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

// Xuất vùng xem trước thành file .doc mở được bằng Word — nhúng thẳng cùng 1 khối
// CSS thể thức NĐ30 (REPORT_CSS) như đang dùng để hiển thị/in, giống đúng cơ chế
// "HTML lồng namespace Word" mà 5S_Dashboard_BVTB_v4 dùng — không cần thư viện ngoài.
function exportWordDoc(node: HTMLElement, filename: string) {
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

export default function BaoCao() {
  const { khoaList } = useCatalog();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // Dữ liệu lấy từ cache Redux dùng chung (danhGiaSlice/khacPhucSlice) --
  // không tự gọi API riêng nữa.
  const danhGia = useDanhGia();
  const khacPhuc = useKhacPhuc();
  const rows = danhGia.rows;
  const kpRows = khacPhuc.rows;

  // Admin/Lãnh đạo/Phòng QLCL: xem được báo cáo của MỌI khoa, gồm cả 2 luồng
  // dữ liệu -- Phòng QLCL đi đánh giá khoa khác VÀ khoa/phòng tự đánh giá (xem
  // isSelfReview/isQlclAudit ở lichUtils.ts, cùng logic đã dùng để tách 2 luồng
  // lịch/đánh giá ở BangKiem.tsx). Trưởng khoa/Nhân viên: CHỈ xem báo cáo dữ
  // liệu khoa/phòng tự đánh giá của ĐÚNG khoa mình -- không xem được khoa khác,
  // cũng không xem lẫn dữ liệu do Phòng QLCL đánh giá khoa mình (luồng đó dành
  // riêng cho phía QLCL/Admin/Lãnh đạo theo dõi).
  const isRealAdmin = useHasPermission(PERMISSION.TAO_TAI_KHOAN);
  const isAdminOrLanhDao = useHasPermission(
    PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH,
  );
  const isQlclRole =
    useHasPermission(PERMISSION.XEM_TONG_HOP_TAT_CA_KHOA) && !isRealAdmin;
  const canViewAllKhoa = isAdminOrLanhDao || isQlclRole;

  const scopedRows = useMemo(() => {
    if (canViewAllKhoa) return rows;
    return rows.filter((r) => r.khoa_id === user?.khoa_id && isSelfReview(r));
  }, [rows, canViewAllKhoa, user?.khoa_id]);

  const loading =
    danhGia.status === "idle" ||
    danhGia.status === "loading" ||
    khacPhuc.status === "idle" ||
    khacPhuc.status === "loading";
  const error = danhGia.error || khacPhuc.error;
  const printAreaRef = useRef<HTMLDivElement>(null);

  // "luot" (Báo cáo từng lượt đánh giá) đang tạm ẩn khỏi UI (xem card bị comment
  // ở dưới) -- đổi mặc định sang 'thang' để không mở app vào 1 loại báo cáo
  // không còn nút nào đang bật tương ứng.
  const [rptType, setRptType] = useState<RptType>("thang");
  const [selLuot, setSelLuot] = useState("");
  const [selThang, setSelThang] = useState("");
  const [selKhoa, setSelKhoa] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const [dvKhoa, setDvKhoa] = useState("");
  const [dvFrom, setDvFrom] = useState("");
  const [dvTo, setDvTo] = useState("");

  // ── Báo cáo theo đợt đánh giá ──
  const [dotDanhGiaAllList, setDotDanhGiaAllList] = useState<DotDanhGia[]>([]);
  useEffect(() => {
    fetchDotDanhGiaList()
      .then((res) => setDotDanhGiaAllList(res.rows))
      .catch(() => setDotDanhGiaAllList([]));
  }, []);
  const [selDotId, setSelDotId] = useState("");
  const [selDotKhoa, setSelDotKhoa] = useState("");
  const [dotNhanXet, setDotNhanXet] = useState("");

  // Trưởng khoa/Nhân viên: khoá cứng mọi ô chọn khoa về ĐÚNG khoa mình -- không
  // browse được báo cáo của khoa khác (select tương ứng bị disable ở JSX).
  const effectiveSelKhoa = canViewAllKhoa
    ? selKhoa
    : String(user?.khoa_id ?? "");
  const effectiveDvKhoa = canViewAllKhoa ? dvKhoa : String(user?.khoa_id ?? "");
  const effectiveSelDotKhoa = canViewAllKhoa
    ? selDotKhoa
    : String(user?.khoa_id ?? "");

  // ── Phiếu yêu cầu khắc phục (gửi đơn vị) ──
  const [gkMode, setGkMode] = useState<"ngay" | "luot">("ngay");
  const [gkNgay, setGkNgay] = useState("");
  const [gkKhoa, setGkKhoa] = useState("");
  const [gkLuot, setGkLuot] = useState("");
  const [gkHanDays, setGkHanDays] = useState(5);

  // KPI hôm nay
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const kpiToday = useMemo(() => {
    const todayRows = scopedRows.filter((r) => r.ngay_danh_gia === today);
    return {
      today: todayRows.length,
      ok: todayRows.filter((r) => r.pct >= 85).length,
      kp: todayRows.filter((r) => r.so_tieu_chi_dat < r.so_tieu_chi_tong)
        .length,
      month: scopedRows.filter((r) => r.ngay_danh_gia.startsWith(thisMonth))
        .length,
    };
  }, [scopedRows, today, thisMonth]);

  const thangOptions = useMemo(
    () =>
      [...new Set(scopedRows.map((r) => r.ngay_danh_gia.slice(0, 7)))]
        .sort()
        .reverse(),
    [scopedRows],
  );

  const luot = scopedRows.find((r) => String(r.id) === selLuot);
  const luotKP = useMemo(
    () => kpRows.filter((k) => k.danh_gia_chi_tiet?.danh_gia_id === luot?.id),
    [kpRows, luot],
  );

  const thangRows = useMemo(() => {
    if (!selThang) return [];
    return scopedRows
      .filter(
        (r) =>
          r.ngay_danh_gia.startsWith(selThang) &&
          (!effectiveSelKhoa || String(r.khoa_id) === effectiveSelKhoa),
      )
      .sort((a, b) => b.pct - a.pct);
  }, [scopedRows, selThang, effectiveSelKhoa]);

  // Toàn bộ lượt đánh giá thuộc đúng 1 đợt đánh giá (dot_danh_gia_id) + 1 khoa
  // đã chọn -- dùng cho card "Báo cáo theo đợt đánh giá".
  const dotRows = useMemo(() => {
    if (!selDotId || !effectiveSelDotKhoa) return [];
    return scopedRows
      .filter(
        (r) =>
          String(r.dot_danh_gia_id) === selDotId &&
          String(r.khoa_id) === effectiveSelDotKhoa,
      )
      .sort((a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia));
  }, [scopedRows, selDotId, effectiveSelDotKhoa]);

  const donViRows = useMemo(() => {
    if (!effectiveDvKhoa) return [];
    return scopedRows
      .filter((r) => {
        if (String(r.khoa_id) !== effectiveDvKhoa) return false;
        if (dvFrom && r.ngay_danh_gia < dvFrom) return false;
        if (dvTo && r.ngay_danh_gia > dvTo) return false;
        return true;
      })
      .sort((a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia));
  }, [scopedRows, effectiveDvKhoa, dvFrom, dvTo]);

  // ── Phiếu yêu cầu khắc phục: 2 chế độ chọn dữ liệu ──
  // "Theo ngày": chọn 1 ngày đánh giá -> chỉ hiện các khoa CÓ đánh giá đúng ngày đó
  // (đếm theo toàn viện, không lọc khoa trước) -- tự chọn sẵn nếu ngày đó chỉ có
  // đúng 1 khoa được đánh giá (đỡ phải bấm thêm 1 bước).
  const gkNgayOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of scopedRows)
      map.set(r.ngay_danh_gia, (map.get(r.ngay_danh_gia) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [scopedRows]);

  const gkKhoaOptionsForNgay = useMemo(() => {
    if (!gkNgay) return [] as { khoa_id: number; name: string; n: number }[];
    const map = new Map<number, { name: string; n: number }>();
    for (const r of scopedRows) {
      if (r.ngay_danh_gia !== gkNgay) continue;
      const cur = map.get(r.khoa_id) || {
        name: r.khoa?.ten_khoa || String(r.khoa_id),
        n: 0,
      };
      cur.n++;
      map.set(r.khoa_id, cur);
    }
    return [...map.entries()]
      .map(([khoa_id, v]) => ({ khoa_id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [scopedRows, gkNgay]);

  useEffect(() => {
    setGkKhoa(
      gkKhoaOptionsForNgay.length === 1
        ? String(gkKhoaOptionsForNgay[0].khoa_id)
        : "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reset khi đổi NGÀY, không phải khi danh sách khoa tính lại
  }, [gkNgay]);

  const gkRecs = useMemo(() => {
    if (gkMode === "luot") {
      const r = scopedRows.find((x) => String(x.id) === gkLuot);
      return r ? [r] : [];
    }
    if (!gkNgay || !gkKhoa) return [];
    return scopedRows.filter(
      (r) => r.ngay_danh_gia === gkNgay && String(r.khoa_id) === gkKhoa,
    );
  }, [gkMode, gkLuot, gkNgay, gkKhoa, scopedRows]);

  // Tiêu chí chưa đạt của 1 lượt đánh giá = các dòng khac_phuc gắn với lượt đó
  // (khac_phuc chỉ tự tạo cho tiêu chí ✗ khi lưu Bảng kiểm — xem BangKiem.tsx/danhGia.service.js)
  const kpByDanhGiaId = useMemo(() => {
    const m = new Map<number, KhacPhuc[]>();
    for (const k of kpRows) {
      const id = k.danh_gia_chi_tiet?.danh_gia_id;
      if (id == null) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(k);
    }
    return m;
  }, [kpRows]);

  // Gộp toàn bộ hành động khắc phục của các lượt trong dotRows (giống cách
  // GuiKhoaReport gộp nhiều recs) -- dùng cho mục "III. Hành động khắc phục"
  // của báo cáo theo đợt.
  const dotKPList = useMemo(
    () => dotRows.flatMap((r) => kpByDanhGiaId.get(r.id) || []),
    [dotRows, kpByDanhGiaId],
  );

  const showPreview =
    (rptType === "luot" && !!luot) ||
    (rptType === "thang" && !!selThang) ||
    (rptType === "donvi" && !!effectiveDvKhoa) ||
    (rptType === "dot" && dotRows.length > 0) ||
    (rptType === "guikhoa" && gkRecs.length > 0);

  function handleExportWord() {
    if (!printAreaRef.current) return;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix =
      rptType === "luot"
        ? "PhieuKetQua5S"
        : rptType === "thang"
          ? "BaoCaoThang5S"
          : rptType === "donvi"
            ? "BaoCaoDonVi5S"
            : rptType === "dot"
              ? "BaoCaoDotDanhGia5S"
              : "PhieuYeuCauKP5S";
    exportWordDoc(printAreaRef.current, `${prefix}_${stamp}.doc`);
  }

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; inset: 0; width: 100%; }
          @page { size: A4; margin: 0; }
        }
        ${REPORT_CSS}
      `}</style>

      <div className="print:hidden">
        <PageHeader
          icon={<Printer size={22} />}
          title="Báo cáo & in ấn"
          subtitle="Tạo phiếu báo cáo theo thể thức NĐ 30/2020/NĐ-CP — in trực tiếp, lưu PDF hoặc xuất file Word"
          actions={
            showPreview && (
              <>
                <button className={btnSecondary} onClick={handleExportWord}>
                  <FileDown size={15} /> Xuất file Word
                </button>
                <button className={btnPrimary} onClick={() => window.print()}>
                  <Printer size={15} /> In / Lưu PDF
                </button>
              </>
            )
          }
        />
        {error && (
          <ErrorBanner
            message={error}
            onRetry={() => {
              dispatch(loadDanhGia());
              dispatch(loadKhacPhuc());
            }}
          />
        )}

        <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            label="Hôm nay"
            value={kpiToday.today}
            sub="lượt đánh giá"
            accent="navy"
          />
          <KpiCard
            label="Đạt tốt hôm nay"
            value={kpiToday.ok}
            sub="≥ 85%"
            accent="green"
          />
          <KpiCard
            label="Cần KP hôm nay"
            value={kpiToday.kp}
            sub="có tiêu chí chưa đạt"
            accent="red"
          />
          <KpiCard
            label="Tổng tháng này"
            value={kpiToday.month}
            sub="lượt"
            accent="blue"
          />
        </div>

        {/* ── Chọn loại báo cáo ── */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* Tạm ẩn theo yêu cầu -- bật lại bằng cách bỏ comment khối này (mọi
              logic/state/JSX liên quan ở dưới vẫn còn nguyên, không xoá gì).
          <button
            onClick={() => setRptType('luot')}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === 'luot'
                ? 'border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5'
                : 'border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">📋 Báo cáo từng lượt đánh giá</p>
            <p className="mt-1 text-xs text-gray-400">Phiếu kết quả 1 lượt cụ thể — điểm tổng, tiêu chí lỗi, ký tên 2 bên</p>
          </button>
          */}
          <button
            onClick={() => setRptType("thang")}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === "thang"
                ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
                : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              📊 Báo cáo tổng hợp tháng
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Bảng xếp hạng tất cả lượt trong tháng, điểm trung bình toàn viện
            </p>
          </button>
          <button
            onClick={() => setRptType("donvi")}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === "donvi"
                ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
                : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              🏥 Báo cáo theo đơn vị & ngày
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Lịch sử toàn bộ lượt đánh giá của 1 khoa trong 1 khoảng thời gian
            </p>
          </button>
          <button
            onClick={() => setRptType("dot")}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === "dot"
                ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
                : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              🗂️ Báo cáo theo đợt đánh giá
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Tổng hợp toàn bộ lượt trong 1 đợt đánh giá của 1 khoa/phòng — kèm
              khắc phục, nhận xét
            </p>
          </button>
          <button
            onClick={() => setRptType("guikhoa")}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === "guikhoa"
                ? "border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5"
                : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              📨 Phiếu yêu cầu khắc phục (gửi đơn vị)
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Chỉ liệt kê lỗi — yêu cầu đơn vị điền hành động KP và nộp về trong
              hạn quy định
            </p>
          </button>
        </div>

        {/* ── Chọn dữ liệu ── */}
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {rptType === "luot" && (
            <>
              <Field label="Chọn lượt đánh giá" className="min-w-[300px]">
                <select
                  className={inputCls}
                  value={selLuot}
                  onChange={(e) => setSelLuot(e.target.value)}
                >
                  <option value="">— Chọn lượt —</option>
                  {scopedRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")} ·{" "}
                      {r.khoa?.ten_khoa} · {r.vitri_type?.ten_vitri} · {r.pct}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Nhận xét thêm (tuỳ chọn)"
                className="min-w-[260px] flex-1"
              >
                <input
                  className={inputCls}
                  value={nhanXet}
                  onChange={(e) => setNhanXet(e.target.value)}
                  placeholder="Nhận xét của người kiểm tra..."
                />
              </Field>
            </>
          )}
          {rptType === "thang" && (
            <>
              <Field label="Tháng">
                <select
                  className={inputCls}
                  value={selThang}
                  onChange={(e) => setSelThang(e.target.value)}
                >
                  <option value="">— Chọn tháng —</option>
                  {thangOptions.map((t) => (
                    <option key={t} value={t}>
                      Tháng {t.slice(5)}/{t.slice(0, 4)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Lọc theo khoa (tuỳ chọn)">
                <SearchableSelect
                  value={effectiveSelKhoa}
                  onChange={(v) => setSelKhoa(v)}
                  options={khoaList.map((k) => ({
                    value: String(k.id),
                    label: k.ten_khoa,
                  }))}
                  placeholder="— Tất cả khoa —"
                  disabled={!canViewAllKhoa}
                />
              </Field>
            </>
          )}
          {rptType === "donvi" && (
            <>
              <Field label="Đơn vị (bắt buộc)" className="min-w-[260px]">
                <SearchableSelect
                  value={effectiveDvKhoa}
                  onChange={(v) => setDvKhoa(v)}
                  options={khoaList.map((k) => ({
                    value: String(k.id),
                    label: k.ten_khoa,
                  }))}
                  placeholder="— Chọn khoa —"
                  disabled={!canViewAllKhoa}
                />
              </Field>
              <Field label="Từ ngày">
                <input
                  type="date"
                  className={inputCls}
                  value={dvFrom}
                  onChange={(e) => setDvFrom(e.target.value)}
                />
              </Field>
              <Field label="Đến ngày">
                <input
                  type="date"
                  className={inputCls}
                  value={dvTo}
                  onChange={(e) => setDvTo(e.target.value)}
                />
              </Field>
            </>
          )}
          {rptType === "dot" && (
            <>
              <Field label="Đợt đánh giá (bắt buộc)" className="min-w-[240px]">
                <select
                  className={inputCls}
                  value={selDotId}
                  onChange={(e) => setSelDotId(e.target.value)}
                >
                  <option value="">— Chọn đợt đánh giá —</option>
                  {dotDanhGiaAllList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.ten_dot}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Khoa / Phòng (bắt buộc)" className="min-w-[240px]">
                <SearchableSelect
                  value={effectiveSelDotKhoa}
                  onChange={(v) => setSelDotKhoa(v)}
                  options={khoaList.map((k) => ({
                    value: String(k.id),
                    label: k.ten_khoa,
                  }))}
                  placeholder="— Chọn khoa —"
                  disabled={!canViewAllKhoa}
                />
              </Field>
              <Field
                label="Nhận xét thêm (tuỳ chọn)"
                className="min-w-[260px] flex-1"
              >
                <input
                  className={inputCls}
                  value={dotNhanXet}
                  onChange={(e) => setDotNhanXet(e.target.value)}
                  placeholder="Nhận xét của người kiểm tra..."
                />
              </Field>
            </>
          )}
          {rptType === "guikhoa" && (
            <>
              <Field label="Chế độ">
                <select
                  className={inputCls}
                  value={gkMode}
                  onChange={(e) => setGkMode(e.target.value as "ngay" | "luot")}
                >
                  <option value="ngay">
                    📅 Theo ngày (tổng hợp tất cả vị trí)
                  </option>
                  <option value="luot">📋 Theo từng lượt đánh giá</option>
                </select>
              </Field>
              {gkMode === "ngay" ? (
                <>
                  <Field label="Chọn ngày đánh giá">
                    <select
                      className={inputCls}
                      value={gkNgay}
                      onChange={(e) => setGkNgay(e.target.value)}
                    >
                      <option value="">— Chọn ngày —</option>
                      {gkNgayOptions.map(([ngay, n]) => {
                        const isToday = ngay === today;
                        return (
                          <option key={ngay} value={ngay}>
                            {new Date(ngay).toLocaleDateString("vi-VN")}
                            {isToday ? " ★ Hôm nay" : ""} ({n} vị trí)
                          </option>
                        );
                      })}
                    </select>
                  </Field>
                  {gkNgay && (
                    <Field label="Chọn khoa / phòng / TT">
                      <select
                        className={inputCls}
                        value={gkKhoa}
                        onChange={(e) => setGkKhoa(e.target.value)}
                      >
                        <option value="">— Chọn khoa —</option>
                        {gkKhoaOptionsForNgay.map((k) => (
                          <option key={k.khoa_id} value={k.khoa_id}>
                            {k.name} ({k.n} vị trí)
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </>
              ) : (
                <Field label="Chọn lượt đánh giá" className="min-w-[300px]">
                  <select
                    className={inputCls}
                    value={gkLuot}
                    onChange={(e) => setGkLuot(e.target.value)}
                  >
                    <option value="">— Chọn lượt —</option>
                    {rows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}{" "}
                        · {r.khoa?.ten_khoa} · {r.vitri_type?.ten_vitri} ·{" "}
                        {r.pct}%
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Hạn nộp KP (mặc định 5 ngày)">
                <input
                  type="number"
                  className={inputCls}
                  style={{ maxWidth: 90 }}
                  value={gkHanDays}
                  min={1}
                  max={30}
                  onChange={(e) => setGkHanDays(Number(e.target.value) || 5)}
                />
              </Field>
              <span className="pb-2 text-xs text-gray-400">ngày làm việc</span>
            </>
          )}
        </div>

        {loading && <LoadingRow />}
        {!loading && !showPreview && (
          <EmptyState
            icon={<Printer size={36} />}
            message="Chọn dữ liệu ở trên để xem trước báo cáo"
          />
        )}
      </div>

      {/* ══ VÙNG XEM TRƯỚC + IN ══ */}
      {showPreview && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 print:rounded-none print:border-0 print:shadow-none">
          <div id="print-area" ref={printAreaRef}>
            {rptType === "guikhoa" ? (
              gkRecs.length > 0 && (
                <GuiKhoaReport
                  recs={gkRecs}
                  kpByDanhGiaId={kpByDanhGiaId}
                  hanDays={gkHanDays}
                />
              )
            ) : (
              <div className="pa-wrap">
                {rptType === "luot" && luot && (
                  <LuotReport luot={luot} kpList={luotKP} nhanXet={nhanXet} />
                )}
                {rptType === "thang" && (
                  <ThangReport
                    thang={selThang}
                    khoaLabel={
                      khoaList.find((k) => String(k.id) === effectiveSelKhoa)
                        ?.ten_khoa
                    }
                    rows={thangRows}
                    showNguon={canViewAllKhoa}
                  />
                )}
                {rptType === "donvi" && (
                  <DonViReport
                    khoaTen={
                      khoaList.find((k) => String(k.id) === effectiveDvKhoa)
                        ?.ten_khoa || ""
                    }
                    from={dvFrom}
                    to={dvTo}
                    rows={donViRows}
                    showNguon={canViewAllKhoa}
                  />
                )}
                {rptType === "dot" && (
                  <DotReport
                    dotTen={
                      dotDanhGiaAllList.find((d) => String(d.id) === selDotId)
                        ?.ten_dot || ""
                    }
                    khoaTen={
                      khoaList.find((k) => String(k.id) === effectiveSelDotKhoa)
                        ?.ten_khoa || ""
                    }
                    rows={dotRows}
                    kpList={dotKPList}
                    nhanXet={dotNhanXet}
                    showNguon={canViewAllKhoa}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Header 2 cột theo NĐ30: quốc hiệu tiêu ngữ (phải, gạch chân) + tên đơn vị (trái, gạch chân) + số ký hiệu
function VanBanHeader({
  coQuan1,
  coQuan2,
  soHieu,
  ngayVanBan,
  tenLoai,
  trichYeu,
}: {
  coQuan1: string;
  coQuan2: string;
  soHieu: string;
  ngayVanBan: string;
  tenLoai: string;
  trichYeu: React.ReactNode;
}) {
  return (
    <>
      {/* Dùng <table> thật thay vì div display:table -- Word (mở file .doc qua
          engine riêng, không phải trình duyệt) không đọc display:table/table-cell,
          sẽ xếp 2 cột chồng dọc thay vì song song như web preview. */}
      <table
        className="pa-nd30-header"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            {/* Cột trái hẹp hơn (42%), cột phải rộng hơn (58%) -- nội dung cột phải
            ("CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM") dài hơn cột trái, chia đều
            50/50 làm nó thiếu chỗ và xuống dòng khi mở bằng Word. */}
            <td className="pa-nd30-left" style={{ width: "42%" }}>
              <div className="pa-nd30-coquan">{coQuan1}</div>
              <div className="pa-nd30-ten">{coQuan2}</div>
              <div className="pa-nd30-gach" />
            </td>
            <td className="pa-nd30-right" style={{ width: "58%" }}>
              <div className="pa-nd30-quochieu">
                Cộng hoà xã hội chủ nghĩa Việt Nam
              </div>
              <div className="pa-nd30-tieungu">Độc lập – Tự do – Hạnh phúc</div>
            </td>
          </tr>
        </tbody>
      </table>
      <table
        className="pa-nd30-sohieu"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-nd30-so">Số: ………………/{soHieu}</td>
            <td className="pa-nd30-ngay">
              {DIA_DANH}, {ngayVanBan}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="pa-nd30-tenloai">{tenLoai}</div>
      <div className="pa-nd30-trichyeu">{trichYeu}</div>
    </>
  );
}

function LuotReport({
  luot,
  kpList,
  nhanXet,
}: {
  luot: DanhGia;
  kpList: KhacPhuc[];
  nhanXet: string;
}) {
  const pct = luot.pct;
  const color = rptColor(pct);
  const tag = rptTag(pct);
  const sScores = luot.sScores || [];
  const kienNghi =
    pct >= 85
      ? "tiếp tục phát huy và duy trì thực hành 5S đạt mức Tốt."
      : "thực hiện các biện pháp khắc phục các tiêu chí chưa đạt và báo cáo kết quả về Phòng Quản lý Chất lượng.";

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Phiếu kết quả đánh giá thực hành 5S"
        trichYeu={
          <>
            Tại {luot.vitri_type?.ten_vitri} – {luot.khoa?.ten_khoa}
          </>
        }
      />

      <div className="pa-muc">I. Thông tin đánh giá</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: "bold" }}>
              Đơn vị (Khoa/Phòng/TT):
            </td>
            <td>{luot.khoa?.ten_khoa}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>Ngày đánh giá:</td>
            <td>{new Date(luot.ngay_danh_gia).toLocaleDateString("vi-VN")}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Vị trí đánh giá:</td>
            <td>
              {luot.vitri_type?.ten_vitri}
              {luot.vitri_chi_tiet?.ma_vitri
                ? ` (${luot.vitri_chi_tiet.ma_vitri})`
                : ""}
            </td>
            <td style={{ fontWeight: "bold" }}>Đợt đánh giá:</td>
            <td>{luot.dot_danh_gia}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Người đánh giá:</td>
            <td>{luot.nguoi_danh_gia?.username}</td>
            <td style={{ fontWeight: "bold" }}>Số tiêu chí đạt:</td>
            <td>
              <strong>
                {luot.so_tieu_chi_dat}/{luot.so_tieu_chi_tong}
              </strong>{" "}
              tiêu chí
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>
          {pct}%
        </div>
        <div className="pa-ket-loai" style={{ color }}>
          {tag}
        </div>
        <div className="pa-ket-detail">
          Tỷ lệ đạt tiêu chí / Tổng số tiêu chí
        </div>
      </div>
      {sScores.length > 0 && (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Mã S</th>
              <th style={{ width: "20%" }}>Nội dung</th>
              <th style={{ width: "8%" }}>TC đạt</th>
              <th style={{ width: "8%" }}>Tổng TC</th>
              <th style={{ width: "12%" }}>Tỷ lệ</th>
              <th>Biểu đồ</th>
            </tr>
          </thead>
          <tbody>
            {S_IDS.map((id) => {
              const s = sScores.find((x) => x.id === id);
              if (!s) return null;
              const c =
                s.pct >= 80
                  ? "#1D9E75"
                  : s.pct >= 60
                    ? S_META[id].color
                    : "#A32D2D";
              return (
                <tr key={id}>
                  <td
                    style={{
                      fontWeight: "bold",
                      color: S_META[id].color,
                      textAlign: "center",
                    }}
                  >
                    {id}
                  </td>
                  <td>{s.name || S_META[id].name}</td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>
                    {s.ok}
                  </td>
                  <td style={{ textAlign: "center" }}>{s.total}</td>
                  <td
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      color: c,
                    }}
                  >
                    {s.pct}%
                  </td>
                  <td className="pa-bar" style={{ color: c }}>
                    {barChart(s.pct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="pa-muc">III. Hành động khắc phục</div>
      {kpList.length === 0 ? (
        <div className="pa-nd" style={{ color: "#1D9E75", fontWeight: "bold" }}>
          ✓ Tất cả tiêu chí đạt yêu cầu — không có nội dung cần khắc phục.
        </div>
      ) : (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>TT</th>
              <th style={{ width: "6%" }}>Mã S</th>
              <th style={{ width: "28%" }}>Tiêu chí chưa đạt</th>
              <th>Hành động khắc phục</th>
              <th style={{ width: "12%" }}>Hạn xử lý</th>
              <th style={{ width: "12%" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {kpList.map((k, i) => (
              <tr key={k.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td
                  style={{
                    fontWeight: "bold",
                    textAlign: "center",
                    color:
                      S_META[k.danh_gia_chi_tiet?.checklist_item?.s_id || ""]
                        ?.color,
                  }}
                >
                  {k.danh_gia_chi_tiet?.checklist_item?.s_id}
                </td>
                <td>
                  {k.danh_gia_chi_tiet?.checklist_item?.tc}
                  {k.danh_gia_chi_tiet?.ghi_chu && (
                    <i> — {k.danh_gia_chi_tiet.ghi_chu}</i>
                  )}
                </td>
                <td>
                  {k.hanh_dong_khac_phuc || (
                    <span style={{ color: "#185FA5", fontStyle: "italic" }}>
                      💡 Gợi ý AI:{" "}
                      {smartSuggestKP(
                        k.danh_gia_chi_tiet?.checklist_item?.tc || "",
                        k.danh_gia_chi_tiet?.checklist_item?.s_id || "",
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {k.han_xu_ly
                    ? new Date(k.han_xu_ly).toLocaleDateString("vi-VN")
                    : ""}
                </td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>
                  {k.trang_thai}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-nd">
        {nhanXet || "(Điền nhận xét của người kiểm tra)"}
      </div>
      <div className="pa-nd">
        Căn cứ kết quả đánh giá, đề nghị {luot.khoa?.ten_khoa} {kienNghi}
      </div>

      <hr className="pa-divider" />

      <table
        className="pa-footer-tbl"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-noinha">
              <div className="pa-noinha-title">Nơi nhận:</div>
              <div>- {luot.khoa?.ten_khoa} (để thực hiện);</div>
              <div>- Phòng QLCL (để theo dõi);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div className="pa-kyte-chucvu">Trưởng phòng QLCL</div>
              <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
              <div className="pa-kyte-ten">&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-footer-note">
        Phiếu được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
        Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  );
}

function ThangReport({
  thang,
  khoaLabel,
  rows,
  showNguon,
}: {
  thang: string;
  khoaLabel?: string;
  rows: DanhGia[];
  showNguon?: boolean;
}) {
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0;
  const color = rptColor(avg);
  const thangLabel = thang
    ? `tháng ${thang.slice(5)} năm ${thang.slice(0, 4)}`
    : "tất cả các kỳ";
  const pham_vi = khoaLabel || "Toàn bệnh viện";
  const datTot = rows.filter((r) => r.pct >= 85).length;

  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {};
    for (const r of rows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 };
        cur.ok += s.ok;
        cur.total += s.total;
        agg[s.id] = cur;
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id];
      return { id, pct: v && v.total ? Math.round((v.ok / v.total) * 100) : 0 };
    });
  }, [rows]);

  const khoaAvgMap = useMemo(() => buildKhoaAvgMap(rows), [rows]);
  // Chỉ tách 2 luồng (Phòng QLCL đánh giá khoa khác VS khoa/phòng tự đánh giá)
  // khi showNguon bật (Admin/Lãnh đạo/Phòng QLCL) -- Trưởng khoa/Nhân viên chỉ
  // có 1 luồng dữ liệu (tự đánh giá) nên giữ nguyên 1 bảng gộp như trước.
  const qlclKhoaAvgMap = useMemo(
    () => (showNguon ? buildKhoaAvgMap(rows.filter(isQlclAudit)) : []),
    [rows, showNguon],
  );
  const selfKhoaAvgMap = useMemo(
    () => (showNguon ? buildKhoaAvgMap(rows.filter(isSelfReview)) : []),
    [rows, showNguon],
  );

  const topStr = khoaAvgMap
    .slice(0, 3)
    .map((k) => `${k.khoa} (${k.avg}%)`)
    .join(", ");
  const lowList = khoaAvgMap.filter((k) => k.avg < 70);

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-BV"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo"
        trichYeu={
          <>
            Kết quả thực hành 5S {thangLabel}
            <br />
            {pham_vi}
          </>
        }
      />

      <div style={{ fontStyle: "italic", fontSize: "12pt", margin: "4mm 0" }}>
        <div>
          Căn cứ Kế hoạch số ………/KH-BVTB về triển khai thực hành 5S năm{" "}
          {new Date().getFullYear()};
        </div>
        <div style={{ marginTop: "1mm" }}>
          Phòng Quản lý Chất lượng báo cáo kết quả như sau:
        </div>
      </div>

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "35%", fontWeight: "bold" }}>Kỳ báo cáo:</td>
            <td>{thangLabel}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>Phạm vi:</td>
            <td>{pham_vi}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tổng lượt đánh giá:</td>
            <td>
              <strong>{rows.length}</strong> lượt
            </td>
            <td style={{ fontWeight: "bold" }}>Số đơn vị:</td>
            <td>
              <strong>{khoaAvgMap.length}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tỷ lệ đạt TB:</td>
            <td style={{ fontWeight: "bold", color }}>{avg}%</td>
            <td style={{ fontWeight: "bold" }}>Đạt tốt:</td>
            <td style={{ fontWeight: "bold", color: "#1D9E75" }}>
              {datTot} lượt
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả theo từng nội dung 5S</div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "10%" }}>Mã S</th>
            <th style={{ width: "18%" }}>Nội dung</th>
            <th style={{ width: "15%" }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
            <th style={{ width: "18%" }}>Nhận xét</th>
          </tr>
        </thead>
        <tbody>
          {sAvg.map((s) => {
            const c =
              s.pct >= 80
                ? "#1D9E75"
                : s.pct >= 60
                  ? S_META[s.id].color
                  : "#A32D2D";
            const nxet =
              s.pct >= 80
                ? "Tốt"
                : s.pct >= 70
                  ? "Khá"
                  : s.pct >= 60
                    ? "Trung bình"
                    : "Cần cải thiện";
            return (
              <tr key={s.id}>
                <td
                  style={{
                    fontWeight: "bold",
                    color: S_META[s.id].color,
                    textAlign: "center",
                  }}
                >
                  {s.id}
                </td>
                <td>{S_META[s.id].name}</td>
                <td
                  style={{ fontWeight: "bold", color: c, textAlign: "center" }}
                >
                  {s.pct}%
                </td>
                <td className="pa-bar" style={{ color: c }}>
                  {barChart(s.pct)}
                </td>
                <td
                  style={{ fontWeight: "bold", color: c, textAlign: "center" }}
                >
                  {nxet}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showNguon ? (
        <>
          <div className="pa-muc">
            III. Xếp hạng theo đơn vị — so sánh 2 luồng đánh giá
          </div>
          <KhoaCompareTable
            rows={buildKhoaCompareRows(qlclKhoaAvgMap, selfKhoaAvgMap)}
          />
        </>
      ) : (
        <>
          <div className="pa-muc">III. Xếp hạng theo đơn vị</div>
          <KhoaRankTable rows={khoaAvgMap} />
        </>
      )}

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-dieu">1. Ưu điểm</div>
      <div className="pa-nd">
        {topStr || "—"} là đơn vị thực hành 5S tốt nhất kỳ này. Tỷ lệ đạt trung
        bình toàn viện đạt {avg}%.
      </div>
      <div className="pa-dieu">2. Tồn tại</div>
      <div className="pa-nd">
        {lowList.length
          ? `Còn ${lowList.length} đơn vị chưa đạt: ${lowList.map((k) => k.khoa).join(", ")}.`
          : "Tất cả đơn vị đã đạt mức Đạt trở lên."}
      </div>
      <div className="pa-dieu">3. Kiến nghị</div>
      <div className="pa-nd">
        Đề nghị các đơn vị chưa đạt lập kế hoạch khắc phục, gửi về Phòng QLCL
        trong vòng 07 ngày làm việc.
      </div>

      <hr className="pa-divider" />

      <table
        className="pa-footer-tbl"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-noinha">
              <div className="pa-noinha-title">Nơi nhận:</div>
              <div>- Ban Giám đốc (để báo cáo);</div>
              <div>- Các khoa, phòng, TT (để thực hiện);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div
                style={{ fontSize: "10pt", fontStyle: "italic", color: "#444" }}
              >
                KT. GIÁM ĐỐC
              </div>
              <div className="pa-kyte-chucvu">Phó Giám đốc</div>
              <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
              <div className="pa-kyte-ten">&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-footer-note">
        Báo cáo được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
        Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  );
}

function DonViReport({
  khoaTen,
  from,
  to,
  rows,
  showNguon,
}: {
  khoaTen: string;
  from: string;
  to: string;
  rows: DanhGia[];
  showNguon?: boolean;
}) {
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0;
  const color = rptColor(avg);
  const vitriGroups = useMemo(() => {
    const m = new Map<string, DanhGia[]>();
    for (const r of rows) {
      const key = r.vitri_type?.ten_vitri || "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {};
    for (const r of rows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 };
        cur.ok += s.ok;
        cur.total += s.total;
        agg[s.id] = cur;
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id];
      return { id, pct: v && v.total ? Math.round((v.ok / v.total) * 100) : 0 };
    });
  }, [rows]);

  const rangeLabel =
    from && to
      ? `${new Date(from).toLocaleDateString("vi-VN")} – ${new Date(to).toLocaleDateString("vi-VN")}`
      : from
        ? `từ ${new Date(from).toLocaleDateString("vi-VN")}`
        : to
          ? `đến ${new Date(to).toLocaleDateString("vi-VN")}`
          : "Tất cả";

  return (
    <>
      <VanBanHeader
        coQuan1="Bệnh viện Đa khoa Thái Bình"
        coQuan2="Phòng Quản lý chất lượng"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo"
        trichYeu={
          <>
            Kết quả thực hành 5S – {khoaTen}
            <br />
            Kỳ: {rangeLabel}
          </>
        }
      />

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: "bold" }}>Đơn vị:</td>
            <td>{khoaTen}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>
              Khoảng thời gian:
            </td>
            <td>{rangeLabel}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tổng lượt đánh giá:</td>
            <td>
              <strong>{rows.length}</strong> lượt
            </td>
            <td style={{ fontWeight: "bold" }}>Số vị trí đánh giá:</td>
            <td>
              <strong>{vitriGroups.length}</strong> vị trí
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Tỷ lệ đạt TB:</td>
            <td style={{ fontWeight: "bold", color }} colSpan={3}>
              {avg}% – {rptTag(avg)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>
          {avg}%
        </div>
        <div className="pa-ket-loai" style={{ color }}>
          {rptTag(avg)}
        </div>
        <div className="pa-ket-detail">
          Tỷ lệ đạt trung bình tất cả lượt đánh giá
        </div>
      </div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "10%" }}>Mã S</th>
            <th style={{ width: "20%" }}>Nội dung</th>
            <th style={{ width: "15%" }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
          </tr>
        </thead>
        <tbody>
          {sAvg.map((s) => {
            const c =
              s.pct >= 80
                ? "#1D9E75"
                : s.pct >= 60
                  ? S_META[s.id].color
                  : "#A32D2D";
            return (
              <tr key={s.id}>
                <td
                  style={{
                    fontWeight: "bold",
                    color: S_META[s.id].color,
                    textAlign: "center",
                  }}
                >
                  {s.id}
                </td>
                <td>{S_META[s.id].name}</td>
                <td
                  style={{ fontWeight: "bold", color: c, textAlign: "center" }}
                >
                  {s.pct}%
                </td>
                <td className="pa-bar" style={{ color: c }}>
                  {barChart(s.pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pa-muc">III. Kết quả theo từng vị trí</div>
      {vitriGroups.length === 0 && (
        <div className="pa-nd" style={{ fontStyle: "italic" }}>
          Không có lượt đánh giá nào trong khoảng thời gian đã chọn.
        </div>
      )}
      {vitriGroups.map(([vitri, vrows]) => {
        const vAvg = Math.round(
          vrows.reduce((s, r) => s + r.pct, 0) / vrows.length,
        );
        const vc = rptColor(vAvg);
        return (
          <div key={vitri} style={{ marginBottom: "6mm" }}>
            <div
              style={{
                fontWeight: "bold",
                fontSize: "12pt",
                color: "#1B3A5C",
                marginBottom: "2mm",
              }}
            >
              📍 {vitri} &nbsp;
              <span style={{ fontWeight: "normal", color: vc }}>
                {vAvg}% – {rptTag(vAvg)}
              </span>
            </div>
            <table className="pa-bangket">
              <thead>
                <tr>
                  <th style={{ width: "6%" }}>#</th>
                  <th style={{ width: "14%" }}>Ngày</th>
                  <th style={{ width: showNguon ? "18%" : "22%" }}>
                    Người đánh giá
                  </th>
                  {showNguon && <th style={{ width: "16%" }}>Nguồn</th>}
                  <th style={{ width: "12%" }}>Đợt</th>
                  <th style={{ width: "12%" }}>Tỷ lệ đạt</th>
                  <th style={{ width: "12%" }}>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {vrows.map((r, i) => {
                  const rc = rptColor(r.pct);
                  return (
                    <tr key={r.id}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>
                        {new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}
                      </td>
                      <td>{r.nguoi_danh_gia?.username}</td>
                      {showNguon && (
                        <td
                          style={{
                            fontSize: "10pt",
                            color: isSelfReview(r) ? "#1D9E75" : "#185FA5",
                          }}
                        >
                          {nguonLabel(r)}
                        </td>
                      )}
                      <td>{r.dot_danh_gia}</td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: rc,
                          textAlign: "center",
                        }}
                      >
                        {r.pct}%
                      </td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: rc,
                          textAlign: "center",
                        }}
                      >
                        {rptTag(r.pct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <hr className="pa-divider" />

      <table
        className="pa-footer-tbl"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-noinha">
              <div className="pa-noinha-title">Nơi nhận:</div>
              <div>- {khoaTen} (để thực hiện);</div>
              <div>- Phòng QLCL (để lưu);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div
                style={{ fontSize: "10pt", fontWeight: "bold", color: "#444" }}
              >
                Trưởng phòng QLCL
              </div>
              <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
              <div className="pa-kyte-ten">&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-footer-note">
        Báo cáo được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
        Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  );
}

// Báo cáo theo đợt đánh giá — gộp TOÀN BỘ lượt đánh giá của 1 khoa/phòng trong
// đúng 1 đợt đánh giá (dot_danh_gia_id) thành 1 phiếu duy nhất: tư duy bố cục
// giống LuotReport (I. Thông tin, II. Kết quả tổng hợp, III. Hành động khắc
// phục, IV. Nhận xét/kiến nghị + ký tên) nhưng gộp nhiều lượt như DonViReport.
function DotReport({
  dotTen,
  khoaTen,
  rows,
  kpList,
  nhanXet,
  showNguon,
}: {
  dotTen: string;
  khoaTen: string;
  rows: DanhGia[];
  kpList: KhacPhuc[];
  nhanXet: string;
  showNguon?: boolean;
}) {
  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
    : 0;
  const color = rptColor(avg);
  const tag = rptTag(avg);
  const tuNgay = rows[0]?.ngay_danh_gia;
  const denNgay = rows[rows.length - 1]?.ngay_danh_gia;
  const rangeLabel =
    tuNgay && denNgay
      ? tuNgay === denNgay
        ? new Date(tuNgay).toLocaleDateString("vi-VN")
        : `${new Date(tuNgay).toLocaleDateString("vi-VN")} – ${new Date(denNgay).toLocaleDateString("vi-VN")}`
      : "—";
  const kienNghi =
    avg >= 85
      ? "tiếp tục phát huy và duy trì thực hành 5S đạt mức Tốt."
      : "thực hiện các biện pháp khắc phục các tiêu chí chưa đạt và báo cáo kết quả về Phòng Quản lý Chất lượng.";

  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {};
    for (const r of rows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 };
        cur.ok += s.ok;
        cur.total += s.total;
        agg[s.id] = cur;
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id];
      return { id, pct: v && v.total ? Math.round((v.ok / v.total) * 100) : 0 };
    });
  }, [rows]);

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo kết quả thực hành 5S theo đợt đánh giá"
        trichYeu={
          <>
            Đợt: {dotTen}
            <br />
            {khoaTen}
          </>
        }
      />

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: "30%", fontWeight: "bold" }}>Đơn vị:</td>
            <td>{khoaTen}</td>
            <td style={{ width: "25%", fontWeight: "bold" }}>Đợt đánh giá:</td>
            <td>{dotTen}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold" }}>Khoảng thời gian:</td>
            <td>{rangeLabel}</td>
            <td style={{ fontWeight: "bold" }}>Tổng lượt đánh giá:</td>
            <td>
              <strong>{rows.length}</strong> lượt
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>
          {avg}%
        </div>
        <div className="pa-ket-loai" style={{ color }}>
          {tag}
        </div>
        <div className="pa-ket-detail">
          Tỷ lệ đạt trung bình tất cả lượt đánh giá trong đợt
        </div>
      </div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "10%" }}>Mã S</th>
            <th style={{ width: "20%" }}>Nội dung</th>
            <th style={{ width: "15%" }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
          </tr>
        </thead>
        <tbody>
          {sAvg.map((s) => {
            const c =
              s.pct >= 80
                ? "#1D9E75"
                : s.pct >= 60
                  ? S_META[s.id].color
                  : "#A32D2D";
            return (
              <tr key={s.id}>
                <td
                  style={{
                    fontWeight: "bold",
                    color: S_META[s.id].color,
                    textAlign: "center",
                  }}
                >
                  {s.id}
                </td>
                <td>{S_META[s.id].name}</td>
                <td
                  style={{ fontWeight: "bold", color: c, textAlign: "center" }}
                >
                  {s.pct}%
                </td>
                <td className="pa-bar" style={{ color: c }}>
                  {barChart(s.pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: "5%" }}>#</th>
            <th style={{ width: "13%" }}>Ngày</th>
            <th style={{ width: showNguon ? "17%" : "20%" }}>Vị trí</th>
            <th style={{ width: showNguon ? "15%" : "18%" }}>Người đánh giá</th>
            {showNguon && <th style={{ width: "15%" }}>Nguồn</th>}
            <th style={{ width: "12%" }}>Tỷ lệ đạt</th>
            <th style={{ width: "12%" }}>Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rc = rptColor(r.pct);
            return (
              <tr key={r.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td>{new Date(r.ngay_danh_gia).toLocaleDateString("vi-VN")}</td>
                <td>{r.vitri_type?.ten_vitri}</td>
                <td>{r.nguoi_danh_gia?.username}</td>
                {showNguon && (
                  <td
                    style={{
                      fontSize: "10pt",
                      color: isSelfReview(r) ? "#1D9E75" : "#185FA5",
                    }}
                  >
                    {nguonLabel(r)}
                  </td>
                )}
                <td
                  style={{ fontWeight: "bold", color: rc, textAlign: "center" }}
                >
                  {r.pct}%
                </td>
                <td
                  style={{ fontWeight: "bold", color: rc, textAlign: "center" }}
                >
                  {rptTag(r.pct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pa-muc">III. Hành động khắc phục</div>
      {kpList.length === 0 ? (
        <div className="pa-nd" style={{ color: "#1D9E75", fontWeight: "bold" }}>
          ✓ Tất cả tiêu chí đạt yêu cầu — không có nội dung cần khắc phục.
        </div>
      ) : (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>TT</th>
              <th style={{ width: "6%" }}>Mã S</th>
              <th style={{ width: "26%" }}>Tiêu chí chưa đạt</th>
              <th>Hành động khắc phục</th>
              <th style={{ width: "12%" }}>Hạn xử lý</th>
              <th style={{ width: "12%" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {kpList.map((k, i) => (
              <tr key={k.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td
                  style={{
                    fontWeight: "bold",
                    textAlign: "center",
                    color:
                      S_META[k.danh_gia_chi_tiet?.checklist_item?.s_id || ""]
                        ?.color,
                  }}
                >
                  {k.danh_gia_chi_tiet?.checklist_item?.s_id}
                </td>
                <td>
                  {k.danh_gia_chi_tiet?.checklist_item?.tc}
                  {k.danh_gia_chi_tiet?.ghi_chu && (
                    <i> — {k.danh_gia_chi_tiet.ghi_chu}</i>
                  )}
                </td>
                <td>
                  {k.hanh_dong_khac_phuc || (
                    <span style={{ color: "#185FA5", fontStyle: "italic" }}>
                      💡 Gợi ý AI:{" "}
                      {smartSuggestKP(
                        k.danh_gia_chi_tiet?.checklist_item?.tc || "",
                        k.danh_gia_chi_tiet?.checklist_item?.s_id || "",
                      )}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {k.han_xu_ly
                    ? new Date(k.han_xu_ly).toLocaleDateString("vi-VN")
                    : ""}
                </td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>
                  {k.trang_thai}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-nd">
        {nhanXet || "(Điền nhận xét của người kiểm tra)"}
      </div>
      <div className="pa-nd">
        Căn cứ kết quả đánh giá, đề nghị {khoaTen} {kienNghi}
      </div>

      <hr className="pa-divider" />

      <table
        className="pa-footer-tbl"
        border={0}
        cellPadding={0}
        cellSpacing={0}
      >
        <tbody>
          <tr>
            <td className="pa-noinha">
              <div className="pa-noinha-title">Nơi nhận:</div>
              <div>- {khoaTen} (để thực hiện);</div>
              <div>- Phòng QLCL (để theo dõi);</div>
              <div>- Lưu: VT, QLCL.</div>
            </td>
            <td className="pa-kyte">
              <div className="pa-kyte-chucvu">Trưởng phòng QLCL</div>
              <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
              <div className="pa-kyte-ten">&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pa-footer-note">
        Báo cáo được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
        Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  );
}

// Phiếu yêu cầu khắc phục (gửi đơn vị) — văn bản 2 trang độc lập:
// Trang 1: Phòng QLCL gửi khoa, liệt kê các tiêu chí chưa đạt, yêu cầu nộp lại
//   trong `hanDays` ngày làm việc.
// Trang 2: mẫu để khoa điền tay (Gợi ý hành động KP tự động điền bằng AI cục bộ,
//   các ô Hành động thực tế/Người thực hiện/Hạn HT để trống cho khoa điền).
// Mỗi trang tự có khối .pa-wrap riêng (không lồng trong .pa-wrap của BaoCao())
// để page-break-before hoạt động đúng, giống cách 5S_Dashboard_BVTB_v4 nối 2
// văn bản độc lập (trang1 + trang2) thay vì lồng chung 1 khối.
function GuiKhoaReport({
  recs,
  kpByDanhGiaId,
  hanDays,
}: {
  recs: DanhGia[];
  kpByDanhGiaId: Map<number, KhacPhuc[]>;
  hanDays: number;
}) {
  const hanNop = addWorkDays(new Date(), hanDays);
  const ngayDG = recs[0]?.ngay_danh_gia || "";
  const khoaLabel = recs[0]?.khoa?.ten_khoa || "";
  const isMulti = recs.length > 1;

  interface Issue {
    danhGiaId: number;
    sid: string;
    color: string;
    text: string;
  }
  const allIssues: Issue[] = [];
  for (const r of recs) {
    for (const k of kpByDanhGiaId.get(r.id) || []) {
      const ci = k.danh_gia_chi_tiet?.checklist_item;
      if (!ci) continue;
      allIssues.push({
        danhGiaId: r.id,
        sid: ci.s_id,
        color: S_META[ci.s_id]?.color || "#444",
        text: ci.tc,
      });
    }
  }

  if (allIssues.length === 0) {
    return (
      <div className="pa-wrap" style={{ textAlign: "center", padding: "30mm" }}>
        <div style={{ fontSize: "14pt", color: "#1D9E75", fontWeight: "bold" }}>
          ✓ Không có tiêu chí chưa đạt — không cần phiếu yêu cầu khắc phục
        </div>
      </div>
    );
  }

  const mucI = "I";
  const mucII = isMulti ? "II" : "I";
  const mucIII = isMulti ? "III" : "II";
  const maKhoa = maDonVi(khoaLabel);
  const vitriGroups = recs
    .map((r) => ({ r, issues: allIssues.filter((x) => x.danhGiaId === r.id) }))
    .filter((g) => g.issues.length > 0);

  return (
    <>
      {/* ══ TRANG 1 — Phiếu yêu cầu khắc phục (Phòng QLCL gửi khoa) ══ */}
      <div className="pa-wrap">
        <VanBanHeader
          coQuan1="Sở Y tế tỉnh Hưng Yên"
          coQuan2="Bệnh viện Đa khoa Thái Bình"
          soHieu="YCKP-QLCL"
          ngayVanBan={`ngày ${ngayThangNamStr()}`}
          tenLoai="Phiếu yêu cầu khắc phục"
          trichYeu={<>Kết quả đánh giá thực hành 5S – {khoaLabel}</>}
        />
        <div style={{ margin: "4mm 0 3mm", fontSize: "13pt" }}>
          <span style={{ fontStyle: "italic" }}>Kính gửi: </span>
          <strong>{khoaLabel}</strong>
        </div>
        <div
          style={{ fontStyle: "italic", fontSize: "12pt", marginBottom: "4mm" }}
        >
          Căn cứ kết quả đánh giá thực hành 5S ngày{" "}
          <strong>{new Date(ngayDG).toLocaleDateString("vi-VN")}</strong>
          {isMulti ? (
            <>
              {" "}
              tại <strong>{recs.length} vị trí</strong>
            </>
          ) : (
            <>
              {" "}
              tại <strong>{recs[0]?.vitri_type?.ten_vitri}</strong> (Người đánh
              giá: {recs[0]?.nguoi_danh_gia?.username})
            </>
          )}
          , Phòng Quản lý chất lượng thông báo các tiêu chí chưa đạt yêu cầu như
          sau:
        </div>

        {isMulti && (
          <>
            <div className="pa-muc">{mucI}. Tổng hợp kết quả theo vị trí</div>
            <table className="pa-bangket">
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>STT</th>
                  <th style={{ width: "20%" }}>Vị trí</th>
                  <th style={{ width: "18%" }}>Người ĐG</th>
                  <th style={{ width: "12%" }}>Tỷ lệ</th>
                  <th style={{ width: "15%" }}>Xếp loại</th>
                  <th style={{ width: "12%" }}>TC chưa đạt</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r, i) => {
                  const c = rptColor(r.pct);
                  const issCount = allIssues.filter(
                    (x) => x.danhGiaId === r.id,
                  ).length;
                  return (
                    <tr key={r.id}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>{r.vitri_type?.ten_vitri}</td>
                      <td>{r.nguoi_danh_gia?.username}</td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: c,
                        }}
                      >
                        {r.pct}%
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: c,
                        }}
                      >
                        {rptTag(r.pct)}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          color: "#A32D2D",
                        }}
                      >
                        {issCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="pa-muc">{mucII}. Các tiêu chí chưa đạt yêu cầu</div>
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>STT</th>
              {isMulti && <th style={{ width: "16%" }}>Vị trí</th>}
              <th style={{ width: "7%" }}>Mã S</th>
              <th style={{ width: isMulti ? "15%" : "20%" }}>Nội dung</th>
              <th>Tiêu chí chưa đạt</th>
            </tr>
          </thead>
          <tbody>
            {allIssues.map((iss, i) => {
              const r = recs.find((x) => x.id === iss.danhGiaId);
              return (
                <tr key={i}>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>
                    {i + 1}
                  </td>
                  {isMulti && (
                    <td style={{ fontSize: "10pt" }}>
                      {r?.vitri_type?.ten_vitri}
                    </td>
                  )}
                  <td
                    style={{
                      fontWeight: "bold",
                      color: iss.color,
                      textAlign: "center",
                    }}
                  >
                    {iss.sid}
                  </td>
                  <td style={{ color: iss.color, fontSize: "10pt" }}>
                    {S_META[iss.sid]?.name}
                  </td>
                  <td>{iss.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="pa-muc">{mucIII}. Yêu cầu</div>
        <div className="pa-nd" style={{ marginBottom: "2mm" }}>
          Đề nghị <strong>{khoaLabel}</strong> thực hiện:
        </div>
        <div className="pa-nd" style={{ marginBottom: "2mm" }}>
          <strong>1.</strong> Điền đầy đủ hành động khắc phục vào Phiếu hành
          động khắc phục đính kèm đối với từng tiêu chí chưa đạt.
        </div>
        <div className="pa-nd" style={{ marginBottom: "2mm" }}>
          <strong>2.</strong> Gửi Phiếu hành động khắc phục về Phòng QLCL trước
          ngày <strong>{hanNop.toLocaleDateString("vi-VN")}</strong> ({hanDays}{" "}
          ngày làm việc kể từ ngày nhận phiếu này).
        </div>
        <div className="pa-nd" style={{ marginBottom: "4mm" }}>
          <strong>3.</strong> Triển khai thực hiện và báo cáo kết quả theo đúng
          hạn đã cam kết.
        </div>
        <div
          className="pa-nd"
          style={{ marginTop: "2mm", fontStyle: "italic", fontSize: "12pt" }}
        >
          Trân trọng đề nghị Trưởng {khoaLabel} quan tâm, phối hợp thực hiện./.
        </div>

        <hr className="pa-divider" />
        <table
          className="pa-footer-tbl"
          border={0}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td className="pa-noinha">
                <div className="pa-noinha-title">Nơi nhận:</div>
                <div>- {khoaLabel} (để thực hiện);</div>
                <div>- Phòng QLCL (để theo dõi);</div>
                <div>- Lưu: VT, QLCL.</div>
              </td>
              <td className="pa-kyte">
                <div className="pa-kyte-chucvu">Trưởng phòng QLCL</div>
                <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
                <div className="pa-kyte-ten">&nbsp;</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="pa-footer-note">
          Phiếu được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
          Thái Bình – Ngày in: {ngayThangNamStr()}
        </div>
      </div>

      {/* ══ TRANG 2 — Phiếu hành động khắc phục (khoa điền, gửi lại QLCL) ══ */}
      <div className="pa-wrap" style={{ pageBreakBefore: "always" }}>
        <VanBanHeader
          coQuan1="Bệnh viện Đa khoa Thái Bình"
          coQuan2={khoaLabel}
          soHieu={`HĐKP-${maKhoa}`}
          ngayVanBan={`ngày ${ngayThangNamStr()}`}
          tenLoai="Phiếu hành động khắc phục"
          trichYeu={
            <>
              {khoaLabel} – Ngày đánh giá:{" "}
              {new Date(ngayDG).toLocaleDateString("vi-VN")}
            </>
          }
        />
        <div
          style={{ margin: "3mm 0 2mm", fontSize: "12pt", fontStyle: "italic" }}
        >
          Kính gửi:{" "}
          <strong>
            Phòng Quản lý chất lượng – Bệnh viện Đa khoa Thái Bình
          </strong>
        </div>
        <div
          style={{ fontSize: "12pt", marginBottom: "4mm", fontStyle: "italic" }}
        >
          Thực hiện Phiếu yêu cầu khắc phục số ………………/YCKP-QLCL ngày{" "}
          {ngayThangNamStr()}, {khoaLabel} xin báo cáo hành động khắc phục như
          sau:
        </div>
        <div
          style={{
            fontWeight: "bold",
            fontSize: "12pt",
            margin: "2mm 0",
            color: "#1B3A5C",
          }}
        >
          Bảng hành động khắc phục
        </div>
        <table className="pa-bangket" style={{ marginTop: "3mm" }}>
          <thead>
            <tr>
              <th style={{ width: "4%" }}>STT</th>
              <th style={{ width: "6%" }}>Mã S</th>
              <th style={{ width: "26%" }}>Tiêu chí chưa đạt</th>
              <th style={{ width: "22%" }}>
                Gợi ý hành động KP{" "}
                <span style={{ fontSize: "8pt", fontWeight: 400 }}>
                  💡 Gợi ý
                </span>
              </th>
              <th style={{ width: "18%" }}>Hành động thực tế</th>
              <th style={{ width: "12%" }}>Người thực hiện</th>
              <th style={{ width: "12%" }}>Hạn HT</th>
            </tr>
          </thead>
          <tbody>
            {vitriGroups.map((grp) => (
              <Fragment key={grp.r.id}>
                <tr style={{ background: "#E8F0FB" }}>
                  <td
                    colSpan={7}
                    style={{
                      fontWeight: "bold",
                      fontSize: "11pt",
                      color: "#1B3A5C",
                      padding: "5pt 8pt",
                    }}
                  >
                    📍 Vị trí: <strong>{grp.r.vitri_type?.ten_vitri}</strong>
                    &nbsp;|&nbsp; Ngày ĐG:{" "}
                    {new Date(grp.r.ngay_danh_gia).toLocaleDateString("vi-VN")}
                    &nbsp;|&nbsp; Tỷ lệ: <strong>{grp.r.pct}%</strong>
                  </td>
                </tr>
                {grp.issues.map((iss, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        verticalAlign: "middle",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        fontWeight: "bold",
                        color: iss.color,
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      {iss.sid}
                    </td>
                    <td style={{ fontSize: "10pt" }}>{iss.text}</td>
                    <td style={{ fontSize: "10pt", color: "#185FA5" }}>
                      <span style={{ fontSize: "9pt", marginRight: 3 }}>
                        💡
                      </span>
                      {smartSuggestKP(iss.text, iss.sid)}
                    </td>
                    <td>
                      &nbsp;
                      <br />
                      &nbsp;
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
        <div
          style={{ marginTop: "5mm", fontSize: "11pt", fontStyle: "italic" }}
        >
          {khoaLabel} cam kết thực hiện đúng các hành động khắc phục trên và báo
          cáo kết quả về Phòng Quản lý chất lượng theo đúng hạn đã ghi.
        </div>
        {/* Bảng thật thay vì display:grid -- Word không đọc CSS Grid, sẽ xếp
            3 cột chồng dọc thay vì song song như web preview. table-layout:fixed
            + border=0 -- nếu không khoá cứng, Word tự co giãn cột theo độ dài
            chữ trong ô (VD "TRƯỞNG BAN BẢO VỆ" dài hơn) khiến 3 cột lệch nhau,
            nhìn mất cân đối/không thẳng trục thay vì chia đều 3 phần bằng nhau. */}
        <table
          style={{
            width: "100%",
            tableLayout: "fixed",
            borderCollapse: "collapse",
            border: "none",
            marginTop: "8mm",
          }}
          border={0}
          cellPadding={0}
          cellSpacing={0}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: "none",
                  width: "33.33%",
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                <div style={{ fontStyle: "italic" }}>Người điền phiếu</div>
                <div style={{ fontWeight: "bold" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ marginTop: "18mm" }}>&nbsp;</div>
              </td>
              <td
                style={{
                  border: "none",
                  width: "33.33%",
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                <div style={{ fontStyle: "italic" }}>5S Champion</div>
                <div style={{ fontWeight: "bold" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ marginTop: "18mm" }}>&nbsp;</div>
              </td>
              <td
                style={{
                  border: "none",
                  width: "33.33%",
                  textAlign: "center",
                  fontSize: "11pt",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "10pt",
                    textTransform: "uppercase",
                  }}
                >
                  Trưởng {khoaLabel}
                </div>
                <div style={{ fontWeight: "bold" }}>(Ký, ghi rõ họ tên)</div>
                <div style={{ marginTop: "18mm" }}>&nbsp;</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="pa-footer-note">
          Phiếu được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa
          Thái Bình – Ngày in: {ngayThangNamStr()}
        </div>
      </div>
    </>
  );
}
