import { useEffect, useMemo, useState } from 'react'
import { fetchVitriChiTietList } from './api'
import type { VitriChiTiet, VitriType } from './types'
import { useAppSelector } from '../../app/hooks'

// Hook đọc cấu hình khoa – vị trí (trang Cấu hình > mục 1).
// - `types`: danh sách vị trí đánh giá hiển thị cho khoa đã chọn.
//   Khoa đã cấu hình => chỉ các vị trí được tick; khoa CHƯA cấu hình => toàn bộ
//   (fallback để khoa chưa cấu hình vẫn đánh giá được).
// - `maByType`: vitri_type_id -> danh sách bản ghi mã vị trí chi tiết (E101, Xe tiêm 2...).
// - `hasConfig`: khoa đã có cấu hình hay chưa.
export function useKhoaViTri(khoaId: number | '') {
  const vitriTypes = useAppSelector((s) => s.catalog.vitriTypes)
  const [rows, setRows] = useState<VitriChiTiet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (khoaId === '') {
      setRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    fetchVitriChiTietList({ khoa_id: Number(khoaId) })
      .then((res) => !cancelled && setRows(res.rows))
      .catch(() => !cancelled && setRows([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [khoaId])

  const maByType = useMemo(() => {
    const m = new Map<number, VitriChiTiet[]>()
    for (const r of rows) {
      const list = m.get(r.vitri_type_id) || []
      list.push(r)
      m.set(r.vitri_type_id, list)
    }
    return m
  }, [rows])

  const hasConfig = rows.length > 0

  const types: VitriType[] = useMemo(() => {
    if (khoaId === '' || !hasConfig) return vitriTypes
    return vitriTypes.filter((v) => maByType.has(v.id))
  }, [khoaId, hasConfig, vitriTypes, maByType])

  return { types, maByType, hasConfig, loading }
}
