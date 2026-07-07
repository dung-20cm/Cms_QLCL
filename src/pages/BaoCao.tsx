import { useCallback, useEffect, useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import {
  PageHeader,
  KpiCard,
  Field,
  inputCls,
  btnPrimary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
} from '../components/ui/PageShell'
import { fetchDanhGiaList, fetchKhacPhucList } from '../features/qlcl/api'
import type { DanhGia, KhacPhuc } from '../features/qlcl/types'
import { xepLoaiFromPct } from '../features/qlcl/types'

type RptType = 'luot' | 'thang'

const todayVN = () => new Date().toLocaleDateString('vi-VN')

export default function BaoCao() {
  const { khoaList } = useCatalog()
  const [rows, setRows] = useState<DanhGia[]>([])
  const [kpRows, setKpRows] = useState<KhacPhuc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rptType, setRptType] = useState<RptType>('luot')
  const [selLuot, setSelLuot] = useState('')
  const [selThang, setSelThang] = useState('')
  const [selKhoa, setSelKhoa] = useState('')
  const [nhanXet, setNhanXet] = useState('')

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

  const showPreview = (rptType === 'luot' && !!luot) || (rptType === 'thang' && !!selThang)

  return (
    <div>
      {/* CSS in ấn — chỉ in vùng print-area, khổ A4, Times New Roman theo NĐ30 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; inset: 0; width: 100%; }
          @page { size: A4; margin: 18mm 15mm; }
        }
        #print-area { font-family: "Times New Roman", Times, serif; color: #000; }
      `}</style>

      <div className="print:hidden">
        <PageHeader
          icon={<Printer size={22} />}
          title="Báo cáo & in ấn"
          subtitle="Tạo phiếu báo cáo theo thể thức NĐ 30/2020/NĐ-CP — in trực tiếp hoặc lưu PDF"
          actions={
            showPreview && (
              <button className={btnPrimary} onClick={() => window.print()}>
                <Printer size={15} /> In / Lưu PDF
              </button>
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
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>

        {/* ── Chọn dữ liệu ── */}
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {rptType === 'luot' ? (
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
          ) : (
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
                <select className={inputCls} value={selKhoa} onChange={(e) => setSelKhoa(e.target.value)}>
                  <option value="">— Tất cả khoa —</option>
                  {khoaList.map((k) => (
                    <option key={k.id} value={k.id}>{k.ten_khoa}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
        </div>

        {loading && <LoadingRow />}
        {!loading && !showPreview && (
          <EmptyState icon={<Printer size={36} />} message="Chọn lượt đánh giá hoặc tháng để xem trước báo cáo" />
        )}
      </div>

      {/* ══ VÙNG XEM TRƯỚC + IN ══ */}
      {showPreview && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 print:rounded-none print:border-0 print:shadow-none">
          <div id="print-area" className="mx-auto max-w-[210mm] bg-white px-10 py-8 text-[13px] leading-relaxed text-black">
            {/* Header 2 cột theo NĐ30 */}
            <div className="mb-6 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="font-bold uppercase">Bệnh viện Đa khoa Thái Bình</p>
                <p className="font-bold uppercase">Phòng Quản lý chất lượng</p>
                <p className="mx-auto mt-1 w-24 border-b border-black" />
              </div>
              <div>
                <p className="font-bold uppercase">Cộng hoà xã hội chủ nghĩa Việt Nam</p>
                <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
                <p className="mx-auto mt-1 w-40 border-b border-black" />
              </div>
            </div>

            {rptType === 'luot' && luot && (
              <LuotReport luot={luot} kpList={luotKP} nhanXet={nhanXet} />
            )}
            {rptType === 'thang' && (
              <ThangReport thang={selThang} rows={thangRows} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LuotReport({ luot, kpList, nhanXet }: { luot: DanhGia; kpList: KhacPhuc[]; nhanXet: string }) {
  const xl = xepLoaiFromPct(luot.pct)
  return (
    <>
      <h2 className="mb-1 text-center text-[16px] font-bold uppercase">Phiếu kết quả đánh giá 5S</h2>
      <p className="mb-5 text-center italic">
        Ngày đánh giá: {new Date(luot.ngay_danh_gia).toLocaleDateString('vi-VN')} — {luot.dot_danh_gia}
      </p>

      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr>
            <td className="w-1/2 py-0.5"><b>Đơn vị được đánh giá:</b> {luot.khoa?.ten_khoa}</td>
            <td className="py-0.5"><b>Vị trí:</b> {luot.vitri_type?.ten_vitri}{luot.vitri_chi_tiet?.ma_vitri ? ` (${luot.vitri_chi_tiet.ma_vitri})` : ''}</td>
          </tr>
          <tr>
            <td className="py-0.5"><b>Người đánh giá:</b> {luot.nguoi_danh_gia?.username}</td>
            <td className="py-0.5"><b>Số tiêu chí:</b> {luot.so_tieu_chi_dat}/{luot.so_tieu_chi_tong} đạt</td>
          </tr>
        </tbody>
      </table>

      {/* Hộp kết quả */}
      <div className="mb-5 border-2 border-black p-3 text-center">
        <span className="text-[15px]">Tỷ lệ đạt: <b className="text-[20px]">{luot.pct}%</b> — Xếp loại: <b className="uppercase">{xl.label}</b></span>
        <p className="mt-1 text-[11px] italic">(≥90%: Xuất sắc · ≥75%: Tốt · ≥60%: Khá · &lt;60%: Cần cải thiện)</p>
      </div>

      {/* Tiêu chí lỗi + hành động khắc phục */}
      <p className="mb-1 font-bold">I. Các tiêu chí chưa đạt và hành động khắc phục</p>
      {kpList.length === 0 ? (
        <p className="mb-4 italic">Không ghi nhận tiêu chí chưa đạt cần khắc phục.</p>
      ) : (
        <table className="mb-4 w-full border-collapse border border-black text-[12px]">
          <thead>
            <tr className="text-center font-bold">
              <td className="border border-black px-1.5 py-1">TT</td>
              <td className="border border-black px-1.5 py-1">Nhóm</td>
              <td className="border border-black px-1.5 py-1">Tiêu chí chưa đạt</td>
              <td className="border border-black px-1.5 py-1">Hành động khắc phục</td>
              <td className="border border-black px-1.5 py-1">Hạn xử lý</td>
              <td className="border border-black px-1.5 py-1">Trạng thái</td>
            </tr>
          </thead>
          <tbody>
            {kpList.map((k, i) => (
              <tr key={k.id}>
                <td className="border border-black px-1.5 py-1 text-center">{i + 1}</td>
                <td className="border border-black px-1.5 py-1 text-center">{k.danh_gia_chi_tiet?.checklist_item?.s_id}</td>
                <td className="border border-black px-1.5 py-1">
                  {k.danh_gia_chi_tiet?.checklist_item?.tc}
                  {k.danh_gia_chi_tiet?.ghi_chu && <i> — {k.danh_gia_chi_tiet.ghi_chu}</i>}
                </td>
                <td className="border border-black px-1.5 py-1">{k.hanh_dong_khac_phuc}</td>
                <td className="border border-black px-1.5 py-1 text-center">{k.han_xu_ly ? new Date(k.han_xu_ly).toLocaleDateString('vi-VN') : ''}</td>
                <td className="border border-black px-1.5 py-1 text-center">{k.trang_thai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mb-1 font-bold">II. Nhận xét của người kiểm tra</p>
      <p className="mb-8 min-h-[40px] italic">{nhanXet || '................................................................................'}</p>

      {/* Ký tên 2 cột */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="font-bold uppercase">Người đánh giá</p>
          <p className="italic">(Ký, ghi rõ họ tên)</p>
          <p className="mt-20">{luot.nguoi_danh_gia?.username}</p>
        </div>
        <div>
          <p className="italic">Thái Bình, ngày {todayVN()}</p>
          <p className="font-bold uppercase">Trưởng khoa/phòng</p>
          <p className="italic">(Ký, ghi rõ họ tên)</p>
        </div>
      </div>
    </>
  )
}

function ThangReport({ thang, rows }: { thang: string; rows: DanhGia[] }) {
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0
  return (
    <>
      <h2 className="mb-1 text-center text-[16px] font-bold uppercase">
        Báo cáo tổng hợp kết quả đánh giá 5S tháng {thang.slice(5)}/{thang.slice(0, 4)}
      </h2>
      <p className="mb-5 text-center italic">Tổng {rows.length} lượt đánh giá — Tỷ lệ đạt trung bình toàn viện: <b>{avg}%</b></p>

      <table className="mb-6 w-full border-collapse border border-black text-[12px]">
        <thead>
          <tr className="text-center font-bold">
            <td className="border border-black px-1.5 py-1">Hạng</td>
            <td className="border border-black px-1.5 py-1">Ngày</td>
            <td className="border border-black px-1.5 py-1">Khoa / Phòng / TT</td>
            <td className="border border-black px-1.5 py-1">Vị trí</td>
            <td className="border border-black px-1.5 py-1">Đạt/Tổng</td>
            <td className="border border-black px-1.5 py-1">% Đạt</td>
            <td className="border border-black px-1.5 py-1">Xếp loại</td>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="border border-black px-1.5 py-1 text-center">{i + 1}</td>
              <td className="border border-black px-1.5 py-1 text-center">{new Date(r.ngay_danh_gia).toLocaleDateString('vi-VN')}</td>
              <td className="border border-black px-1.5 py-1">{r.khoa?.ten_khoa}</td>
              <td className="border border-black px-1.5 py-1">{r.vitri_type?.ten_vitri}</td>
              <td className="border border-black px-1.5 py-1 text-center">{r.so_tieu_chi_dat}/{r.so_tieu_chi_tong}</td>
              <td className="border border-black px-1.5 py-1 text-center font-bold">{r.pct}%</td>
              <td className="border border-black px-1.5 py-1 text-center">{xepLoaiFromPct(r.pct).label}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-black px-2 py-3 text-center italic">Không có lượt đánh giá nào trong tháng</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="font-bold uppercase">Người lập báo cáo</p>
          <p className="italic">(Ký, ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="italic">Thái Bình, ngày {todayVN()}</p>
          <p className="font-bold uppercase">Trưởng phòng QLCL</p>
          <p className="italic">(Ký, ghi rõ họ tên)</p>
        </div>
      </div>
    </>
  )
}
