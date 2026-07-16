import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Printer, FileDown } from 'lucide-react'
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
} from '../components/ui/PageShell'
import SearchableSelect from '../components/ui/SearchableSelect'
import { fetchDanhGiaList, fetchKhacPhucList } from '../features/qlcl/api'
import type { DanhGia, KhacPhuc } from '../features/qlcl/types'

type RptType = 'luot' | 'thang' | 'donvi'

const S_META: Record<string, { name: string; color: string }> = {
  S1: { name: 'Sàng lọc', color: '#D85A30' },
  S2: { name: 'Sắp xếp', color: '#BA7517' },
  S3: { name: 'Sạch sẽ', color: '#1D9E75' },
  S4: { name: 'Săn sóc', color: '#185FA5' },
  S5: { name: 'Sẵn sàng', color: '#534AB7' },
}
const S_IDS = ['S1', 'S2', 'S3', 'S4', 'S5']

// Địa danh dùng trong thể thức văn bản NĐ30 — khớp quốc hiệu "SỞ Y TẾ TỈNH HƯNG YÊN"
// (Bệnh viện Đa khoa Thái Bình đặt tại tỉnh Hưng Yên).
const DIA_DANH = 'Hưng Yên'

// "12 tháng 7 năm 2026" — thể thức NĐ30, không dùng dd/mm/yyyy
function ngayThangNamStr(d: Date = new Date()) {
  return `${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
}

// Phân loại + màu riêng cho phiếu báo cáo — khớp ĐÚNG 4 mốc + màu của
// 5S_Dashboard_BVTB_v4 (85/70/60), KHÁC với `xepLoaiFromPct` dùng ở các trang
// khác (90/75/60) — cố tình tách riêng để không ảnh hưởng trang Xu hướng/Tổng hợp.
function rptColor(pct: number) {
  return pct >= 85 ? '#1D9E75' : pct >= 70 ? '#185FA5' : pct >= 60 ? '#BA7517' : '#A32D2D'
}
function rptTag(pct: number) {
  return pct >= 85 ? 'Đạt tốt' : pct >= 70 ? 'Đạt' : pct >= 60 ? 'Chưa đạt' : 'Không đạt'
}
function barChart(pct: number) {
  const n = Math.max(0, Math.min(20, Math.round(pct / 5)))
  return '█'.repeat(n) + '░'.repeat(20 - n)
}

// CSS thể thức NĐ30 — dịch nguyên từ khối `.pa-*` trong 5S_Dashboard_BVTB_v4.html
// (dùng chung cho cả preview trên web LẪN file .doc xuất ra, để không lệch định
// dạng giữa 2 nơi — khác bản trước đây dùng class Tailwind, Word không đọc được).
const REPORT_CSS = `
.pa-wrap{font-family:'Times New Roman',Times,serif;font-size:13pt;color:#000;background:#fff;padding:15mm 15mm 15mm 25mm;line-height:1.5;max-width:210mm;margin:0 auto;box-sizing:border-box}
.pa-nd30-header{display:table;width:100%;margin-bottom:4mm}
.pa-nd30-left{display:table-cell;width:50%;vertical-align:top;text-align:center}
.pa-nd30-right{display:table-cell;width:50%;vertical-align:top;text-align:center}
.pa-nd30-coquan{font-size:12pt;font-weight:bold;text-transform:uppercase;line-height:1.3}
.pa-nd30-ten{font-size:12pt;font-weight:bold;text-transform:uppercase;line-height:1.3}
.pa-nd30-gach{width:40%;height:0;border-bottom:1.5pt solid #000;margin:2mm auto 0}
.pa-nd30-quochieu{font-size:12pt;font-weight:bold;text-transform:uppercase}
.pa-nd30-tieungu{font-size:13pt;font-weight:bold;text-decoration:underline}
.pa-nd30-sohieu{display:table;width:100%;margin:3mm 0 0}
.pa-nd30-so{display:table-cell;width:50%;text-align:center;font-size:12pt}
.pa-nd30-ngay{display:table-cell;width:50%;text-align:center;font-size:12pt;font-style:italic}
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
.pa-footer-tbl{display:table;width:100%;margin-top:8mm}
.pa-noinha{display:table-cell;width:45%;vertical-align:top;font-size:11pt}
.pa-noinha-title{font-weight:bold;font-size:12pt}
.pa-kyte{display:table-cell;width:55%;text-align:center;vertical-align:top}
.pa-kyte-chucvu{font-weight:bold;font-size:13pt;text-transform:uppercase}
.pa-kyte-note{font-style:italic;font-size:11pt}
.pa-kyte-ten{font-weight:bold;font-size:13pt;margin-top:25mm}
.pa-divider{border:none;border-top:0.5pt solid #aaa;margin:4mm 0}
.pa-footer-note{font-size:9pt;color:#888;margin-top:6mm;text-align:center;font-style:italic}
`

// Xuất vùng xem trước thành file .doc mở được bằng Word — nhúng thẳng cùng 1 khối
// CSS thể thức NĐ30 (REPORT_CSS) như đang dùng để hiển thị/in, giống đúng cơ chế
// "HTML lồng namespace Word" mà 5S_Dashboard_BVTB_v4 dùng — không cần thư viện ngoài.
function exportWordDoc(node: HTMLElement, filename: string) {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><title>Báo cáo 5S</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
@page { size: 21cm 29.7cm; margin: 20mm 20mm 20mm 30mm; }
body { margin: 0; }
${REPORT_CSS}
</style>
</head>
<body>${node.innerHTML}</body>
</html>`
  const blob = new Blob(['﻿', html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function BaoCao() {
  const { khoaList } = useCatalog()
  const [rows, setRows] = useState<DanhGia[]>([])
  const [kpRows, setKpRows] = useState<KhacPhuc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const printAreaRef = useRef<HTMLDivElement>(null)

  const [rptType, setRptType] = useState<RptType>('luot')
  const [selLuot, setSelLuot] = useState('')
  const [selThang, setSelThang] = useState('')
  const [selKhoa, setSelKhoa] = useState('')
  const [nhanXet, setNhanXet] = useState('')
  const [dvKhoa, setDvKhoa] = useState('')
  const [dvFrom, setDvFrom] = useState('')
  const [dvTo, setDvTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchDanhGiaList(), fetchKhacPhucList().catch(() => ({ rows: [], total: 0 }))])
      .then(([dg, kp]) => {
        setRows(dg.rows.filter((r) => r.active !== 0))
        setKpRows(kp.rows)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  // KPI hôm nay
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)
  const kpiToday = useMemo(() => {
    const todayRows = rows.filter((r) => r.ngay_danh_gia === today)
    return {
      today: todayRows.length,
      ok: todayRows.filter((r) => r.pct >= 85).length,
      kp: todayRows.filter((r) => r.so_tieu_chi_dat < r.so_tieu_chi_tong).length,
      month: rows.filter((r) => r.ngay_danh_gia.startsWith(thisMonth)).length,
    }
  }, [rows, today, thisMonth])

  const thangOptions = useMemo(
    () => [...new Set(rows.map((r) => r.ngay_danh_gia.slice(0, 7)))].sort().reverse(),
    [rows],
  )

  const luot = rows.find((r) => String(r.id) === selLuot)
  const luotKP = useMemo(
    () => kpRows.filter((k) => k.danh_gia_chi_tiet?.danh_gia_id === luot?.id),
    [kpRows, luot],
  )

  const thangRows = useMemo(() => {
    if (!selThang) return []
    return rows
      .filter((r) => r.ngay_danh_gia.startsWith(selThang) && (!selKhoa || String(r.khoa_id) === selKhoa))
      .sort((a, b) => b.pct - a.pct)
  }, [rows, selThang, selKhoa])

  const donViRows = useMemo(() => {
    if (!dvKhoa) return []
    return rows
      .filter((r) => {
        if (String(r.khoa_id) !== dvKhoa) return false
        if (dvFrom && r.ngay_danh_gia < dvFrom) return false
        if (dvTo && r.ngay_danh_gia > dvTo) return false
        return true
      })
      .sort((a, b) => a.ngay_danh_gia.localeCompare(b.ngay_danh_gia))
  }, [rows, dvKhoa, dvFrom, dvTo])

  const showPreview =
    (rptType === 'luot' && !!luot) ||
    (rptType === 'thang' && !!selThang) ||
    (rptType === 'donvi' && !!dvKhoa)

  function handleExportWord() {
    if (!printAreaRef.current) return
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const prefix = rptType === 'luot' ? 'PhieuKetQua5S' : rptType === 'thang' ? 'BaoCaoThang5S' : 'BaoCaoDonVi5S'
    exportWordDoc(printAreaRef.current, `${prefix}_${stamp}.doc`)
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
        {error && <ErrorBanner message={error} onRetry={load} />}

        <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard label="Hôm nay" value={kpiToday.today} sub="lượt đánh giá" accent="navy" />
          <KpiCard label="Đạt tốt hôm nay" value={kpiToday.ok} sub="≥ 85%" accent="green" />
          <KpiCard label="Cần KP hôm nay" value={kpiToday.kp} sub="có tiêu chí chưa đạt" accent="red" />
          <KpiCard label="Tổng tháng này" value={kpiToday.month} sub="lượt" accent="blue" />
        </div>

        {/* ── Chọn loại báo cáo ── */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <button
            onClick={() => setRptType('thang')}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === 'thang'
                ? 'border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5'
                : 'border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">📊 Báo cáo tổng hợp tháng</p>
            <p className="mt-1 text-xs text-gray-400">Bảng xếp hạng tất cả lượt trong tháng, điểm trung bình toàn viện</p>
          </button>
          <button
            onClick={() => setRptType('donvi')}
            className={`rounded-2xl border p-4 text-left transition ${
              rptType === 'donvi'
                ? 'border-brand-500 bg-brand-25 ring-1 ring-brand-200 dark:bg-brand-500/5'
                : 'border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">🏥 Báo cáo theo đơn vị & ngày</p>
            <p className="mt-1 text-xs text-gray-400">Lịch sử toàn bộ lượt đánh giá của 1 khoa trong 1 khoảng thời gian</p>
          </button>
        </div>

        {/* ── Chọn dữ liệu ── */}
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {rptType === 'luot' && (
            <>
              <Field label="Chọn lượt đánh giá" className="min-w-[300px]">
                <select className={inputCls} value={selLuot} onChange={(e) => setSelLuot(e.target.value)}>
                  <option value="">— Chọn lượt —</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.ngay_danh_gia).toLocaleDateString('vi-VN')} · {r.khoa?.ten_khoa} · {r.vitri_type?.ten_vitri} · {r.pct}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nhận xét thêm (tuỳ chọn)" className="min-w-[260px] flex-1">
                <input className={inputCls} value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} placeholder="Nhận xét của người kiểm tra..." />
              </Field>
            </>
          )}
          {rptType === 'thang' && (
            <>
              <Field label="Tháng">
                <select className={inputCls} value={selThang} onChange={(e) => setSelThang(e.target.value)}>
                  <option value="">— Chọn tháng —</option>
                  {thangOptions.map((t) => (
                    <option key={t} value={t}>Tháng {t.slice(5)}/{t.slice(0, 4)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lọc theo khoa (tuỳ chọn)">
                <SearchableSelect
                  value={selKhoa}
                  onChange={(v) => setSelKhoa(v)}
                  options={khoaList.map((k) => ({ value: String(k.id), label: k.ten_khoa }))}
                  placeholder="— Tất cả khoa —"
                />
              </Field>
            </>
          )}
          {rptType === 'donvi' && (
            <>
              <Field label="Đơn vị (bắt buộc)" className="min-w-[260px]">
                <SearchableSelect
                  value={dvKhoa}
                  onChange={(v) => setDvKhoa(v)}
                  options={khoaList.map((k) => ({ value: String(k.id), label: k.ten_khoa }))}
                  placeholder="— Chọn khoa —"
                />
              </Field>
              <Field label="Từ ngày">
                <input type="date" className={inputCls} value={dvFrom} onChange={(e) => setDvFrom(e.target.value)} />
              </Field>
              <Field label="Đến ngày">
                <input type="date" className={inputCls} value={dvTo} onChange={(e) => setDvTo(e.target.value)} />
              </Field>
            </>
          )}
        </div>

        {loading && <LoadingRow />}
        {!loading && !showPreview && (
          <EmptyState icon={<Printer size={36} />} message="Chọn dữ liệu ở trên để xem trước báo cáo" />
        )}
      </div>

      {/* ══ VÙNG XEM TRƯỚC + IN ══ */}
      {showPreview && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 print:rounded-none print:border-0 print:shadow-none">
          <div id="print-area" ref={printAreaRef}>
            <div className="pa-wrap">
              {rptType === 'luot' && luot && (
                <LuotReport luot={luot} kpList={luotKP} nhanXet={nhanXet} />
              )}
              {rptType === 'thang' && (
                <ThangReport thang={selThang} khoaLabel={khoaList.find((k) => String(k.id) === selKhoa)?.ten_khoa} rows={thangRows} />
              )}
              {rptType === 'donvi' && (
                <DonViReport
                  khoaTen={khoaList.find((k) => String(k.id) === dvKhoa)?.ten_khoa || ''}
                  from={dvFrom}
                  to={dvTo}
                  rows={donViRows}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
  coQuan1: string
  coQuan2: string
  soHieu: string
  ngayVanBan: string
  tenLoai: string
  trichYeu: React.ReactNode
}) {
  return (
    <>
      <div className="pa-nd30-header">
        <div className="pa-nd30-left">
          <div className="pa-nd30-coquan">{coQuan1}</div>
          <div className="pa-nd30-ten">{coQuan2}</div>
          <div className="pa-nd30-gach" />
        </div>
        <div className="pa-nd30-right">
          <div className="pa-nd30-quochieu">Cộng hoà xã hội chủ nghĩa Việt Nam</div>
          <div className="pa-nd30-tieungu">Độc lập – Tự do – Hạnh phúc</div>
        </div>
      </div>
      <div className="pa-nd30-sohieu">
        <div className="pa-nd30-so">Số: ………………/{soHieu}</div>
        <div className="pa-nd30-ngay">{DIA_DANH}, {ngayVanBan}</div>
      </div>
      <div className="pa-nd30-tenloai">{tenLoai}</div>
      <div className="pa-nd30-trichyeu">{trichYeu}</div>
    </>
  )
}

function LuotReport({ luot, kpList, nhanXet }: { luot: DanhGia; kpList: KhacPhuc[]; nhanXet: string }) {
  const pct = luot.pct
  const color = rptColor(pct)
  const tag = rptTag(pct)
  const sScores = luot.sScores || []
  const kienNghi =
    pct >= 85
      ? 'tiếp tục phát huy và duy trì thực hành 5S đạt mức Tốt.'
      : 'thực hiện các biện pháp khắc phục các tiêu chí chưa đạt và báo cáo kết quả về Phòng Quản lý Chất lượng.'

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Phiếu kết quả đánh giá thực hành 5S"
        trichYeu={<>Tại {luot.vitri_type?.ten_vitri} – {luot.khoa?.ten_khoa}</>}
      />

      <div className="pa-muc">I. Thông tin đánh giá</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: '30%', fontWeight: 'bold' }}>Đơn vị (Khoa/Phòng/TT):</td>
            <td>{luot.khoa?.ten_khoa}</td>
            <td style={{ width: '25%', fontWeight: 'bold' }}>Ngày đánh giá:</td>
            <td>{new Date(luot.ngay_danh_gia).toLocaleDateString('vi-VN')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Vị trí đánh giá:</td>
            <td>{luot.vitri_type?.ten_vitri}{luot.vitri_chi_tiet?.ma_vitri ? ` (${luot.vitri_chi_tiet.ma_vitri})` : ''}</td>
            <td style={{ fontWeight: 'bold' }}>Đợt đánh giá:</td>
            <td>{luot.dot_danh_gia}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Người đánh giá:</td>
            <td>{luot.nguoi_danh_gia?.username}</td>
            <td style={{ fontWeight: 'bold' }}>Số tiêu chí đạt:</td>
            <td><strong>{luot.so_tieu_chi_dat}/{luot.so_tieu_chi_tong}</strong> tiêu chí</td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>{pct}%</div>
        <div className="pa-ket-loai" style={{ color }}>{tag}</div>
        <div className="pa-ket-detail">Tỷ lệ đạt tiêu chí / Tổng số tiêu chí</div>
      </div>
      {sScores.length > 0 && (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>Mã S</th>
              <th style={{ width: '20%' }}>Nội dung</th>
              <th style={{ width: '8%' }}>TC đạt</th>
              <th style={{ width: '8%' }}>Tổng TC</th>
              <th style={{ width: '12%' }}>Tỷ lệ</th>
              <th>Biểu đồ</th>
            </tr>
          </thead>
          <tbody>
            {S_IDS.map((id) => {
              const s = sScores.find((x) => x.id === id)
              if (!s) return null
              const c = s.pct >= 80 ? '#1D9E75' : s.pct >= 60 ? S_META[id].color : '#A32D2D'
              return (
                <tr key={id}>
                  <td style={{ fontWeight: 'bold', color: S_META[id].color, textAlign: 'center' }}>{id}</td>
                  <td>{s.name || S_META[id].name}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.ok}</td>
                  <td style={{ textAlign: 'center' }}>{s.total}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: c }}>{s.pct}%</td>
                  <td className="pa-bar" style={{ color: c }}>{barChart(s.pct)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <div className="pa-muc">III. Hành động khắc phục</div>
      {kpList.length === 0 ? (
        <div className="pa-nd" style={{ color: '#1D9E75', fontWeight: 'bold' }}>
          ✓ Tất cả tiêu chí đạt yêu cầu — không có nội dung cần khắc phục.
        </div>
      ) : (
        <table className="pa-bangket">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>TT</th>
              <th style={{ width: '6%' }}>Mã S</th>
              <th style={{ width: '28%' }}>Tiêu chí chưa đạt</th>
              <th>Hành động khắc phục</th>
              <th style={{ width: '12%' }}>Hạn xử lý</th>
              <th style={{ width: '12%' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {kpList.map((k, i) => (
              <tr key={k.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td style={{ fontWeight: 'bold', textAlign: 'center', color: S_META[k.danh_gia_chi_tiet?.checklist_item?.s_id || '']?.color }}>
                  {k.danh_gia_chi_tiet?.checklist_item?.s_id}
                </td>
                <td>
                  {k.danh_gia_chi_tiet?.checklist_item?.tc}
                  {k.danh_gia_chi_tiet?.ghi_chu && <i> — {k.danh_gia_chi_tiet.ghi_chu}</i>}
                </td>
                <td>{k.hanh_dong_khac_phuc || '(chưa cập nhật)'}</td>
                <td style={{ textAlign: 'center' }}>{k.han_xu_ly ? new Date(k.han_xu_ly).toLocaleDateString('vi-VN') : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{k.trang_thai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-nd">{nhanXet || '(Điền nhận xét của người kiểm tra)'}</div>
      <div className="pa-nd">Căn cứ kết quả đánh giá, đề nghị {luot.khoa?.ten_khoa} {kienNghi}</div>

      <hr className="pa-divider" />

      <div className="pa-footer-tbl">
        <div className="pa-noinha">
          <div className="pa-noinha-title">Nơi nhận:</div>
          <div>- {luot.khoa?.ten_khoa} (để thực hiện);</div>
          <div>- Phòng QLCL (để theo dõi);</div>
          <div>- Lưu: VT, QLCL.</div>
        </div>
        <div className="pa-kyte">
          <div className="pa-kyte-chucvu">Trưởng phòng QLCL</div>
          <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
          <div className="pa-kyte-ten">&nbsp;</div>
        </div>
      </div>

      <div className="pa-footer-note">
        Phiếu được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  )
}

function ThangReport({ thang, khoaLabel, rows }: { thang: string; khoaLabel?: string; rows: DanhGia[] }) {
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0
  const color = rptColor(avg)
  const thangLabel = thang ? `tháng ${thang.slice(5)} năm ${thang.slice(0, 4)}` : 'tất cả các kỳ'
  const pham_vi = khoaLabel || 'Toàn bệnh viện'
  const datTot = rows.filter((r) => r.pct >= 85).length

  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {}
    for (const r of rows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 }
        cur.ok += s.ok
        cur.total += s.total
        agg[s.id] = cur
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id]
      return { id, pct: v && v.total ? Math.round((v.ok / v.total) * 100) : 0 }
    })
  }, [rows])

  const khoaAvgMap = useMemo(() => {
    const m = new Map<number, { name: string; sum: number; n: number }>()
    for (const r of rows) {
      const cur = m.get(r.khoa_id) || { name: r.khoa?.ten_khoa || '', sum: 0, n: 0 }
      cur.sum += r.pct
      cur.n++
      m.set(r.khoa_id, cur)
    }
    return [...m.entries()]
      .map(([khoa_id, v]) => ({ khoa_id, khoa: v.name, avg: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => b.avg - a.avg)
  }, [rows])

  const topStr = khoaAvgMap.slice(0, 3).map((k) => `${k.khoa} (${k.avg}%)`).join(', ')
  const lowList = khoaAvgMap.filter((k) => k.avg < 70)

  return (
    <>
      <VanBanHeader
        coQuan1="Sở Y tế tỉnh Hưng Yên"
        coQuan2="Bệnh viện Đa khoa Thái Bình"
        soHieu="BC-BV"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo"
        trichYeu={<>Kết quả thực hành 5S {thangLabel}<br />{pham_vi}</>}
      />

      <div style={{ fontStyle: 'italic', fontSize: '12pt', margin: '4mm 0' }}>
        <div>Căn cứ Kế hoạch số ………/KH-BVTB về triển khai thực hành 5S năm {new Date().getFullYear()};</div>
        <div style={{ marginTop: '1mm' }}>Phòng Quản lý Chất lượng báo cáo kết quả như sau:</div>
      </div>

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: '35%', fontWeight: 'bold' }}>Kỳ báo cáo:</td>
            <td>{thangLabel}</td>
            <td style={{ width: '25%', fontWeight: 'bold' }}>Phạm vi:</td>
            <td>{pham_vi}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Tổng lượt đánh giá:</td>
            <td><strong>{rows.length}</strong> lượt</td>
            <td style={{ fontWeight: 'bold' }}>Số đơn vị:</td>
            <td><strong>{khoaAvgMap.length}</strong></td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Tỷ lệ đạt TB:</td>
            <td style={{ fontWeight: 'bold', color }}>{avg}%</td>
            <td style={{ fontWeight: 'bold' }}>Đạt tốt:</td>
            <td style={{ fontWeight: 'bold', color: '#1D9E75' }}>{datTot} lượt</td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả theo từng nội dung 5S</div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Mã S</th>
            <th style={{ width: '18%' }}>Nội dung</th>
            <th style={{ width: '15%' }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
            <th style={{ width: '18%' }}>Nhận xét</th>
          </tr>
        </thead>
        <tbody>
          {sAvg.map((s) => {
            const c = s.pct >= 80 ? '#1D9E75' : s.pct >= 60 ? S_META[s.id].color : '#A32D2D'
            const nxet = s.pct >= 80 ? 'Tốt' : s.pct >= 70 ? 'Khá' : s.pct >= 60 ? 'Trung bình' : 'Cần cải thiện'
            return (
              <tr key={s.id}>
                <td style={{ fontWeight: 'bold', color: S_META[s.id].color, textAlign: 'center' }}>{s.id}</td>
                <td>{S_META[s.id].name}</td>
                <td style={{ fontWeight: 'bold', color: c, textAlign: 'center' }}>{s.pct}%</td>
                <td className="pa-bar" style={{ color: c }}>{barChart(s.pct)}</td>
                <td style={{ fontWeight: 'bold', color: c, textAlign: 'center' }}>{nxet}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="pa-muc">III. Xếp hạng theo đơn vị</div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: '6%' }}>Hạng</th>
            <th>Đơn vị</th>
            <th style={{ width: '12%' }}>Số lượt</th>
            <th style={{ width: '15%' }}>Tỷ lệ đạt</th>
            <th style={{ width: '18%' }}>Xếp loại</th>
          </tr>
        </thead>
        <tbody>
          {khoaAvgMap.map((k, i) => {
            const c = rptColor(k.avg)
            return (
              <tr key={k.khoa_id}>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</td>
                <td>{k.khoa}</td>
                <td style={{ textAlign: 'center' }}>{k.n}</td>
                <td style={{ fontWeight: 'bold', color: c, textAlign: 'center' }}>{k.avg}%</td>
                <td style={{ fontWeight: 'bold', color: c, textAlign: 'center' }}>{rptTag(k.avg)}</td>
              </tr>
            )
          })}
          {khoaAvgMap.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', fontStyle: 'italic' }}>Không có lượt đánh giá nào trong kỳ</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pa-muc">IV. Nhận xét và kiến nghị</div>
      <div className="pa-dieu">1. Ưu điểm</div>
      <div className="pa-nd">{topStr || '—'} là đơn vị thực hành 5S tốt nhất kỳ này. Tỷ lệ đạt trung bình toàn viện đạt {avg}%.</div>
      <div className="pa-dieu">2. Tồn tại</div>
      <div className="pa-nd">
        {lowList.length ? `Còn ${lowList.length} đơn vị chưa đạt: ${lowList.map((k) => k.khoa).join(', ')}.` : 'Tất cả đơn vị đã đạt mức Đạt trở lên.'}
      </div>
      <div className="pa-dieu">3. Kiến nghị</div>
      <div className="pa-nd">Đề nghị các đơn vị chưa đạt lập kế hoạch khắc phục, gửi về Phòng QLCL trong vòng 07 ngày làm việc.</div>

      <hr className="pa-divider" />

      <div className="pa-footer-tbl">
        <div className="pa-noinha">
          <div className="pa-noinha-title">Nơi nhận:</div>
          <div>- Ban Giám đốc (để báo cáo);</div>
          <div>- Các khoa, phòng, TT (để thực hiện);</div>
          <div>- Lưu: VT, QLCL.</div>
        </div>
        <div className="pa-kyte">
          <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#444' }}>KT. Giám đốc</div>
          <div className="pa-kyte-chucvu">Phó Giám đốc</div>
          <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
          <div className="pa-kyte-ten">&nbsp;</div>
        </div>
      </div>

      <div className="pa-footer-note">
        Báo cáo được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  )
}

function DonViReport({ khoaTen, from, to, rows }: { khoaTen: string; from: string; to: string; rows: DanhGia[] }) {
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0
  const color = rptColor(avg)
  const vitriGroups = useMemo(() => {
    const m = new Map<string, DanhGia[]>()
    for (const r of rows) {
      const key = r.vitri_type?.ten_vitri || '—'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(r)
    }
    return [...m.entries()]
  }, [rows])

  const sAvg = useMemo(() => {
    const agg: Record<string, { ok: number; total: number }> = {}
    for (const r of rows) {
      for (const s of r.sScores || []) {
        const cur = agg[s.id] || { ok: 0, total: 0 }
        cur.ok += s.ok
        cur.total += s.total
        agg[s.id] = cur
      }
    }
    return S_IDS.map((id) => {
      const v = agg[id]
      return { id, pct: v && v.total ? Math.round((v.ok / v.total) * 100) : 0 }
    })
  }, [rows])

  const rangeLabel = from && to
    ? `${new Date(from).toLocaleDateString('vi-VN')} – ${new Date(to).toLocaleDateString('vi-VN')}`
    : from
      ? `từ ${new Date(from).toLocaleDateString('vi-VN')}`
      : to
        ? `đến ${new Date(to).toLocaleDateString('vi-VN')}`
        : 'Tất cả'

  return (
    <>
      <VanBanHeader
        coQuan1="Bệnh viện Đa khoa Thái Bình"
        coQuan2="Phòng Quản lý chất lượng"
        soHieu="BC-QLCL"
        ngayVanBan={`ngày ${ngayThangNamStr()}`}
        tenLoai="Báo cáo"
        trichYeu={<>Kết quả thực hành 5S – {khoaTen}<br />Kỳ: {rangeLabel}</>}
      />

      <div className="pa-muc">I. Thông tin chung</div>
      <table className="pa-bangket">
        <tbody>
          <tr>
            <td style={{ width: '30%', fontWeight: 'bold' }}>Đơn vị:</td>
            <td>{khoaTen}</td>
            <td style={{ width: '25%', fontWeight: 'bold' }}>Khoảng thời gian:</td>
            <td>{rangeLabel}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Tổng lượt đánh giá:</td>
            <td><strong>{rows.length}</strong> lượt</td>
            <td style={{ fontWeight: 'bold' }}>Số vị trí đánh giá:</td>
            <td><strong>{vitriGroups.length}</strong> vị trí</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Tỷ lệ đạt TB:</td>
            <td style={{ fontWeight: 'bold', color }} colSpan={3}>{avg}% – {rptTag(avg)}</td>
          </tr>
        </tbody>
      </table>

      <div className="pa-muc">II. Kết quả tổng hợp</div>
      <div className="pa-ket-box" style={{ borderColor: color }}>
        <div className="pa-ket-diem" style={{ color }}>{avg}%</div>
        <div className="pa-ket-loai" style={{ color }}>{rptTag(avg)}</div>
        <div className="pa-ket-detail">Tỷ lệ đạt trung bình tất cả lượt đánh giá</div>
      </div>
      <table className="pa-bangket">
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Mã S</th>
            <th style={{ width: '20%' }}>Nội dung</th>
            <th style={{ width: '15%' }}>Tỷ lệ đạt TB</th>
            <th>Biểu đồ</th>
          </tr>
        </thead>
        <tbody>
          {sAvg.map((s) => {
            const c = s.pct >= 80 ? '#1D9E75' : s.pct >= 60 ? S_META[s.id].color : '#A32D2D'
            return (
              <tr key={s.id}>
                <td style={{ fontWeight: 'bold', color: S_META[s.id].color, textAlign: 'center' }}>{s.id}</td>
                <td>{S_META[s.id].name}</td>
                <td style={{ fontWeight: 'bold', color: c, textAlign: 'center' }}>{s.pct}%</td>
                <td className="pa-bar" style={{ color: c }}>{barChart(s.pct)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="pa-muc">III. Kết quả theo từng vị trí</div>
      {vitriGroups.length === 0 && <div className="pa-nd" style={{ fontStyle: 'italic' }}>Không có lượt đánh giá nào trong khoảng thời gian đã chọn.</div>}
      {vitriGroups.map(([vitri, vrows]) => {
        const vAvg = Math.round(vrows.reduce((s, r) => s + r.pct, 0) / vrows.length)
        const vc = rptColor(vAvg)
        return (
          <div key={vitri} style={{ marginBottom: '6mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12pt', color: '#1B3A5C', marginBottom: '2mm' }}>
              📍 {vitri} &nbsp;<span style={{ fontWeight: 'normal', color: vc }}>{vAvg}% – {rptTag(vAvg)}</span>
            </div>
            <table className="pa-bangket">
              <thead>
                <tr>
                  <th style={{ width: '6%' }}>#</th>
                  <th style={{ width: '16%' }}>Ngày</th>
                  <th style={{ width: '22%' }}>Người đánh giá</th>
                  <th style={{ width: '14%' }}>Đợt</th>
                  <th style={{ width: '14%' }}>Tỷ lệ đạt</th>
                  <th style={{ width: '14%' }}>Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {vrows.map((r, i) => {
                  const rc = rptColor(r.pct)
                  return (
                    <tr key={r.id}>
                      <td style={{ textAlign: 'center' }}>{i + 1}</td>
                      <td>{new Date(r.ngay_danh_gia).toLocaleDateString('vi-VN')}</td>
                      <td>{r.nguoi_danh_gia?.username}</td>
                      <td>{r.dot_danh_gia}</td>
                      <td style={{ fontWeight: 'bold', color: rc, textAlign: 'center' }}>{r.pct}%</td>
                      <td style={{ fontWeight: 'bold', color: rc, textAlign: 'center' }}>{rptTag(r.pct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <hr className="pa-divider" />

      <div className="pa-footer-tbl">
        <div className="pa-noinha">
          <div className="pa-noinha-title">Nơi nhận:</div>
          <div>- {khoaTen} (để thực hiện);</div>
          <div>- Phòng QLCL (để lưu);</div>
          <div>- Lưu: VT, QLCL.</div>
        </div>
        <div className="pa-kyte">
          <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#444' }}>Trưởng phòng QLCL</div>
          <div className="pa-kyte-note">(Ký, ghi rõ họ tên)</div>
          <div className="pa-kyte-ten">&nbsp;</div>
        </div>
      </div>

      <div className="pa-footer-note">
        Báo cáo được tạo tự động bởi Bộ công cụ đánh giá 5S – Bệnh viện Đa khoa Thái Bình – Ngày in: {ngayThangNamStr()}
      </div>
    </>
  )
}
