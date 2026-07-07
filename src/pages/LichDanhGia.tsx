import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import {
  PageHeader,
  KpiCard,
  Field,
  Modal,
  inputCls,
  btnPrimary,
  btnSecondary,
  LoadingRow,
  ErrorBanner,
  EmptyState,
  useCatalog,
} from '../components/ui/PageShell'
import { fetchLichPhanCongList, createUpdateLichPhanCong } from '../features/qlcl/api'
import type { LichPhanCong } from '../features/qlcl/types'
import { useKhoaViTri } from '../features/qlcl/useKhoaViTri'

const THU_LABEL = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN']

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay() // 0=CN
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1))
  x.setHours(0, 0, 0, 0)
  return x
}
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const fmtVN = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

export default function LichDanhGia() {
  const { khoaList, users } = useCatalog()
  const [lichList, setLichList] = useState<LichPhanCong[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [filterNguoi, setFilterNguoi] = useState('')

  // Modal thêm lịch
  const [modalOpen, setModalOpen] = useState(false)
  const [mType, setMType] = useState('dinh_ky')
  const [mThu, setMThu] = useState(1)
  const [mNgay, setMNgay] = useState(fmt(new Date()))
  const [mKhoa, setMKhoa] = useState<number | ''>('')
  const [mVitri, setMVitri] = useState<number | ''>('')
  // Vị trí hiển thị theo cấu hình khoa (trang Cấu hình > mục 1)
  const { types: mConfigTypes } = useKhoaViTri(mKhoa)
  const [mNguoi, setMNguoi] = useState<number[]>([])
  const [mGhiChu, setMGhiChu] = useState('')
  const [savingLich, setSavingLich] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchLichPhanCongList()
      .then((res) => setLichList(res.rows.filter((l) => l.active !== 0)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được lịch'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const weekDays = useMemo(
    () => Array.from({ length: 6 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)),
    [weekStart],
  )

  // Lịch áp dụng cho 1 ngày: định kỳ theo thứ, hoặc một lần/đột xuất đúng ngày
  const lichForDay = useCallback(
    (d: Date) => {
      const thu = d.getDay() === 0 ? 7 : d.getDay() // 1..7
      const dStr = fmt(d)
      return lichList.filter((l) => {
        if (filterNguoi && String(l.nguoi_thuc_hien_id) !== filterNguoi) return false
        if (l.loai_lich === 'dinh_ky') return l.thu_trong_tuan === thu
        return l.ngay_thuc_hien === dStr
      })
    },
    [lichList, filterNguoi],
  )

  const today = new Date()
  const todayLich = lichForDay(today)

  const kpi = useMemo(() => {
    const dinhKy = lichList.filter((l) => l.loai_lich === 'dinh_ky').length
    const dotXuat = lichList.filter((l) => l.loai_lich !== 'dinh_ky').length
    const canBo = new Set(lichList.map((l) => l.nguoi_thuc_hien_id)).size
    return { total: lichList.length, dinhKy, dotXuat, canBo }
  }, [lichList])

  function openModal() {
    setMType('dinh_ky')
    setMThu(1)
    setMNgay(fmt(new Date()))
    setMKhoa('')
    setMVitri('')
    setMNguoi([])
    setMGhiChu('')
    setModalError(null)
    setModalOpen(true)
  }

  async function saveLich() {
    if (mKhoa === '' || mNguoi.length === 0) {
      setModalError('Cần chọn khoa và ít nhất 1 người phụ trách')
      return
    }
    setSavingLich(true)
    setModalError(null)
    try {
      // Quy ước backend: 1 dòng = 1 người → phân công nhiều người = nhiều dòng
      for (const nguoiId of mNguoi) {
        await createUpdateLichPhanCong({
          khoa_id: Number(mKhoa),
          vitri_type_id: mVitri === '' ? null : Number(mVitri),
          loai_lich: mType,
          thu_trong_tuan: mType === 'dinh_ky' ? mThu : null,
          ngay_thuc_hien: mType === 'dinh_ky' ? null : mNgay,
          nguoi_thuc_hien_id: nguoiId,
          ghi_chu: mGhiChu || null,
        })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lưu lịch thất bại')
    } finally {
      setSavingLich(false)
    }
  }

  async function deleteLich(l: LichPhanCong) {
    if (!window.confirm(`Xoá lịch "${l.khoa?.ten_khoa}" của ${l.nguoi_thuc_hien?.username}?`)) return
    try {
      await createUpdateLichPhanCong({ id: l.id, active: 0 })
      setLichList((prev) => prev.filter((x) => x.id !== l.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xoá thất bại')
    }
  }

  return (
    <div>
      <PageHeader
        icon={<CalendarDays size={22} />}
        title="Lịch đánh giá 5S"
        subtitle="Lịch tuần định kỳ · Kiểm tra đột xuất · Phân công cán bộ"
        actions={
          <button className={btnPrimary} onClick={openModal}>
            <Plus size={16} /> Thêm lịch
          </button>
        }
      />
      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Tổng lịch phân công" value={kpi.total} accent="navy" />
        <KpiCard label="Định kỳ hàng tuần" value={kpi.dinhKy} accent="blue" />
        <KpiCard label="Một lần / đột xuất" value={kpi.dotXuat} accent="yellow" />
        <KpiCard label="Cán bộ tham gia" value={kpi.canBo} accent="green" />
      </div>

      {loading ? (
        <LoadingRow />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
          {/* ── Lịch tuần ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button className={btnSecondary} onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86400000))}>
                <ChevronLeft size={16} />
              </button>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Tuần {fmtVN(weekDays[0])} – {fmtVN(weekDays[5])}/{weekDays[5].getFullYear()}
              </p>
              <button className={btnSecondary} onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86400000))}>
                <ChevronRight size={16} />
              </button>
              <button className={btnSecondary} onClick={() => setWeekStart(startOfWeek(new Date()))}>
                Hôm nay
              </button>
              <select className={`${inputCls} ml-auto`} value={filterNguoi} onChange={(e) => setFilterNguoi(e.target.value)}>
                <option value="">— Tất cả cán bộ —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-3">
              {weekDays.map((d, i) => {
                const dayLich = lichForDay(d)
                const isToday = fmt(d) === fmt(today)
                return (
                  <div
                    key={i}
                    className={`min-h-[130px] rounded-xl border p-3 ${
                      isToday
                        ? 'border-brand-300 bg-brand-25 ring-1 ring-brand-200 dark:border-brand-500/40 dark:bg-brand-500/5 dark:ring-brand-500/20'
                        : 'border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/40'
                    }`}
                  >
                    <p className={`mb-2 text-xs font-semibold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {THU_LABEL[i + 1]} · {fmtVN(d)} {isToday && '• Hôm nay'}
                    </p>
                    <div className="space-y-1.5">
                      {dayLich.length === 0 && <p className="text-[11px] text-gray-300 dark:text-gray-600">—</p>}
                      {dayLich.map((l) => (
                        <div key={l.id} className="group rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] leading-tight shadow-sm dark:border-gray-700 dark:bg-gray-900">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{l.khoa?.ten_khoa}</p>
                            <button onClick={() => deleteLich(l)} className="hidden text-gray-300 hover:text-red-500 group-hover:block" title="Xoá">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <p className="text-gray-400">
                            {l.vitri_type?.ten_vitri || 'Tất cả vị trí'} · {l.nguoi_thuc_hien?.username}
                          </p>
                          {l.loai_lich !== 'dinh_ky' && (
                            <span className="mt-0.5 inline-block rounded bg-amber-50 px-1 text-[10px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                              {l.loai_lich === 'dot_xuat' ? 'Đột xuất' : 'Một lần'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Phân công hôm nay ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
              👤 Phân công hôm nay
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                {today.toLocaleDateString('vi-VN')}
              </span>
            </h3>
            {todayLich.length === 0 ? (
              <EmptyState message="Không có lịch hôm nay" />
            ) : (
              <ul className="space-y-2">
                {todayLich.map((l) => (
                  <li key={l.id} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{l.nguoi_thuc_hien?.username}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {l.khoa?.ten_khoa} · {l.vitri_type?.ten_vitri || 'Tất cả vị trí'}
                    </p>
                    {l.ghi_chu && <p className="mt-1 text-[11px] italic text-gray-400">“{l.ghi_chu}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Danh sách toàn bộ lịch ── */}
      {!loading && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Toàn bộ lịch phân công ({lichList.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-3 font-medium">Khoa/Phòng</th>
                  <th className="px-4 py-3 font-medium">Vị trí</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Người thực hiện</th>
                  <th className="px-4 py-3 font-medium">Ghi chú</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lichList.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-3 font-medium text-gray-700 dark:text-gray-200">{l.khoa?.ten_khoa}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{l.vitri_type?.ten_vitri || 'Tất cả'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          l.loai_lich === 'dinh_ky'
                            ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}
                      >
                        {l.loai_lich === 'dinh_ky' ? 'Định kỳ' : l.loai_lich === 'dot_xuat' ? 'Đột xuất' : 'Một lần'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {l.loai_lich === 'dinh_ky' ? THU_LABEL[l.thu_trong_tuan || 0] : l.ngay_thuc_hien}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{l.nguoi_thuc_hien?.username}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-400">{l.ghi_chu}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteLich(l)} className="text-gray-300 transition hover:text-red-500" title="Xoá lịch">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lichList.length === 0 && <EmptyState message="Chưa có lịch nào được lập" />}
          </div>
        </div>
      )}

      {/* ── Modal thêm lịch ── */}
      <Modal
        open={modalOpen}
        title="Thêm lịch đánh giá"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className={btnSecondary} onClick={() => setModalOpen(false)}>Huỷ</button>
            <button className={btnPrimary} onClick={saveLich} disabled={savingLich}>
              {savingLich ? 'Đang lưu...' : 'Lưu lịch'}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Loại lịch">
            <select className={inputCls} value={mType} onChange={(e) => setMType(e.target.value)}>
              <option value="dinh_ky">Định kỳ tuần (chọn thứ)</option>
              <option value="mot_lan">Một lần (chọn ngày cụ thể)</option>
              <option value="dot_xuat">Đột xuất</option>
            </select>
          </Field>
          {mType === 'dinh_ky' ? (
            <Field label="Thứ trong tuần">
              <select className={inputCls} value={mThu} onChange={(e) => setMThu(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((t) => (
                  <option key={t} value={t}>{THU_LABEL[t]}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Ngày đánh giá">
              <input type="date" className={inputCls} value={mNgay} onChange={(e) => setMNgay(e.target.value)} />
            </Field>
          )}
          <Field label="Khoa / Phòng / TT">
            <select className={inputCls} value={mKhoa} onChange={(e) => setMKhoa(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Chọn khoa —</option>
              {khoaList.map((k) => (
                <option key={k.id} value={k.id}>{k.ten_khoa}</option>
              ))}
            </select>
          </Field>
          <Field label="Vị trí đánh giá (theo cấu hình khoa)">
            <select className={inputCls} value={mVitri} onChange={(e) => setMVitri(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— Tất cả vị trí —</option>
              {mConfigTypes.map((v) => (
                <option key={v.id} value={v.id}>{v.ten_vitri}</option>
              ))}
            </select>
          </Field>
          <Field label={`Người phụ trách (${mNguoi.length} đã chọn — mỗi người 1 dòng lịch)`}>
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
              {users.map((u) => {
                const on = mNguoi.includes(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setMNguoi((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      on
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {u.username}
                  </button>
                )
              })}
              {users.length === 0 && <p className="text-xs text-gray-400">Không tải được danh sách cán bộ</p>}
            </div>
          </Field>
          <Field label="Ghi chú">
            <input className={inputCls} value={mGhiChu} onChange={(e) => setMGhiChu(e.target.value)} placeholder="VD: Kiểm tra theo chỉ đạo GĐ..." />
          </Field>
          {modalError && <p className="text-sm text-red-600 dark:text-red-400">✗ {modalError}</p>}
        </div>
      </Modal>
    </div>
  )
}
