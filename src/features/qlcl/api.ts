import { apiClient, ApiError } from '../../lib/axiosClient'
import type {
  Anh5sTuan,
  CreateDanhGiaPayload,
  ChecklistItem,
  DanhGia,
  DotDanhGia,
  Khoa,
  KhacPhuc,
  LichPhanCong,
  ListData,
  PhotoGallery,
  Role,
  UserFull,
  UserLite,
  UserUpsertPayload,
  VitriChiTiet,
  VitriType,
} from './types'

// Backend trả { statusCode, message, data } — axiosClient đã reject khi statusCode != 200
interface Envelope<T> {
  data: T
}

type Query = Record<string, string | number | undefined>

function clean(params?: Query): Query | undefined {
  if (!params) return undefined
  const out: Query = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') out[k] = v
  }
  return out
}

async function getList<T>(entity: string, params?: Query): Promise<ListData<T>> {
  const res = await apiClient.get<Envelope<ListData<T>>>(`/api/${entity}/get-list-${entity}`, {
    params: clean(params),
  })
  return res.data.data
}

// ── Danh mục ──
export const fetchKhoaList = () => getList<Khoa>('khoa')
export const fetchVitriTypeList = () => getList<VitriType>('vitri-type')
export const fetchChecklistItems = (vitri_type_id?: number) =>
  getList<ChecklistItem>('checklist-item', { vitri_type_id })
export const fetchVitriChiTietList = (params?: { khoa_id?: number; vitri_type_id?: number }) =>
  getList<VitriChiTiet>('vitri-chi-tiet', params)

export async function fetchUserList(): Promise<ListData<UserLite>> {
  const res = await apiClient.get<Envelope<ListData<UserLite>>>('/api/user/get-list-user')
  return res.data.data
}

// ── Quản lý tài khoản (Admin — CRUD user + gán role) ──
export async function fetchUserListFull(params?: {
  page?: number
  limit?: number
  name?: string
  email?: string
}): Promise<ListData<UserFull>> {
  const res = await apiClient.get<Envelope<ListData<UserFull>>>('/api/user/get-list-user', {
    params: clean(params),
  })
  return res.data.data
}

export const fetchRoleList = () => getList<Role>('role') // GET /api/role/get-list-role

// ── Cấu hình: loại vị trí đánh giá (CRUD — Admin) ──
export async function createUpdateVitriType(payload: {
  id?: number
  ten_vitri: string
  thu_tu?: number
  active?: number
}): Promise<VitriType> {
  const res = await apiClient.post<Envelope<VitriType>>(
    '/api/vitri-type/create-update-vitri-type',
    payload,
  )
  return res.data.data
}

export async function deleteVitriType(id: number): Promise<void> {
  await apiClient.post(`/api/vitri-type/delete-vitri-type/${id}`)
}

// ── Cấu hình: đợt đánh giá (dot_danh_gia — Admin) ──
export const fetchDotDanhGiaList = (params?: { trang_thai?: string }) =>
  getList<DotDanhGia>('dot-danh-gia', params) // GET /api/dot-danh-gia/get-list-dot-danh-gia

export async function createUpdateDotDanhGia(payload: {
  id?: number
  ten_dot: string
  tu_ngay?: string | null
  den_ngay?: string | null
  mo_ta?: string | null
  trang_thai?: string
}): Promise<DotDanhGia> {
  const res = await apiClient.post<Envelope<DotDanhGia>>(
    '/api/dot-danh-gia/create-update-dot-danh-gia',
    payload,
  )
  return res.data.data
}

export async function deleteDotDanhGia(id: number): Promise<void> {
  await apiClient.post(`/api/dot-danh-gia/delete-dot-danh-gia/${id}`)
}

// ── Cấu hình: khoa ↔ vị trí (vitri_chi_tiet — Admin) ──
export async function createUpdateVitriChiTiet(payload: {
  id?: number
  khoa_id: number
  vitri_type_id: number
  ma_vitri: string
  ghi_chu?: string | null
}): Promise<VitriChiTiet> {
  const res = await apiClient.post<Envelope<VitriChiTiet>>(
    '/api/vitri-chi-tiet/create-update-vitri-chi-tiet',
    payload,
  )
  return res.data.data
}

export async function deleteVitriChiTiet(id: number): Promise<void> {
  await apiClient.post(`/api/vitri-chi-tiet/delete-vitri-chi-tiet/${id}`)
}

export async function createUpdateUser(payload: UserUpsertPayload): Promise<UserFull> {
  const res = await apiClient.post<Envelope<UserFull>>('/api/user/update_user', payload)
  return res.data.data
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.post(`/api/user/delete_user?id=${id}`)
}

// ── Đánh giá ──
export const fetchDanhGiaList = (params?: { khoa_id?: number; page?: number; limit?: number }) =>
  getList<DanhGia>('danh-gia', params)

// Điểm từng nhóm S (S1..S5) do backend tính sẵn trong get-danh-gia/:id
export interface SScore {
  id: string // "S1".."S5"
  name: string
  color: string
  lt: string
  ok: number
  total: number
  pct: number
}

export async function fetchDanhGiaById(id: number): Promise<DanhGia & { sScores: SScore[] }> {
  const res = await apiClient.get<Envelope<DanhGia & { sScores: SScore[] }>>(
    `/api/danh-gia/get-danh-gia/${id}`,
  )
  return res.data.data
}

export async function createDanhGia(payload: CreateDanhGiaPayload): Promise<DanhGia> {
  const res = await apiClient.post<Envelope<DanhGia>>('/api/danh-gia/create-danh-gia', payload)
  return res.data.data
}

// ── Khắc phục ──
export const fetchKhacPhucList = (params?: { trang_thai?: string }) =>
  getList<KhacPhuc>('khac-phuc', params)

export async function createUpdateKhacPhuc(payload: Partial<KhacPhuc>): Promise<KhacPhuc> {
  const res = await apiClient.post<Envelope<KhacPhuc>>(
    '/api/khac-phuc/create-update-khac-phuc',
    payload,
  )
  return res.data.data
}

// ── Lịch phân công ──
export const fetchLichPhanCongList = () => getList<LichPhanCong>('lich-phan-cong')

export async function createUpdateLichPhanCong(
  payload: Partial<LichPhanCong>,
): Promise<LichPhanCong> {
  const res = await apiClient.post<Envelope<LichPhanCong>>(
    '/api/lich-phan-cong/create-update-lich-phan-cong',
    payload,
  )
  return res.data.data
}

// ── Ảnh 5S theo tuần (nhóm Zalo) ──
export const fetchAnh5sTuanList = () => getList<Anh5sTuan>('anh-5s-tuan')

export interface Anh5sTuanPayload {
  id?: number
  khoa_id: number
  tuan: string
  so_luong_anh: number
  chat_luong: string
  ghi_chu?: string
  vi_tri: number[] // danh sách vitri_type_id
  active?: number
}

export async function createUpdateAnh5sTuan(payload: Anh5sTuanPayload): Promise<Anh5sTuan> {
  const { vi_tri, ...rest } = payload
  const res = await apiClient.post<Envelope<Anh5sTuan>>(
    '/api/anh-5s-tuan/create-update-anh-5s-tuan',
    // Backend nhận field `vitri_type_ids` (giữ thêm vi_tri để tương thích ngược)
    { ...rest, vitri_type_ids: vi_tri },
  )
  return res.data.data
}

// ── Xuất báo cáo Nhóm Zalo 5S (HTML in/lưu PDF + Word .doc) ──
// Backend trả file trực tiếp (không bọc JSON); nếu middleware auth trả lỗi
// JSON {signal:0,...} với HTTP 200 thì blob sẽ là JSON — cần tự kiểm tra.
async function downloadBaoCaoZalo(kind: 'html' | 'word', tuan?: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/api/anh-5s-tuan/export-bao-cao-${kind}`, {
    params: clean({ tuan }),
    responseType: 'blob',
  })
  const blob = res.data
  if (blob.type.includes('application/json')) {
    const body = JSON.parse(await blob.text()) as { message?: string }
    throw new ApiError(body.message || 'Xuất báo cáo thất bại')
  }
  // Lấy tên file từ header Content-Disposition: attachment; filename*=UTF-8''...
  const cd = String(res.headers['content-disposition'] || '')
  const m = cd.match(/filename\*=UTF-8''([^;]+)/)
  const fallback = `BaoCaoZalo5S_${(tuan || 'TongHop').replace(/-/g, '')}.${kind === 'word' ? 'doc' : 'html'}`
  const filename = m ? decodeURIComponent(m[1]) : fallback

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const exportBaoCaoZaloHTML = (tuan?: string) => downloadBaoCaoZalo('html', tuan)
export const exportBaoCaoZaloWord = (tuan?: string) => downloadBaoCaoZalo('word', tuan)

// ── Photo gallery (ảnh minh chứng đánh giá) ──
export const fetchPhotoGalleryList = () => getList<PhotoGallery>('photo-gallery')

export async function createPhotoGallery(payload: {
  danh_gia_id: number
  checklist_item_id?: number | null
  url_anh: string
  ten_file?: string
  mime_type?: string
}): Promise<PhotoGallery> {
  const res = await apiClient.post<Envelope<PhotoGallery>>(
    '/api/photo-gallery/create-photo-gallery',
    payload,
  )
  return res.data.data
}

// Upload ảnh lên Cloudinary qua backend, trả về url
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('image', file)
  const res = await apiClient.post<Envelope<{ url?: string; secure_url?: string } | string>>(
    '/api/upload/uploadImage',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  const data = res.data.data
  if (typeof data === 'string') return { url: data }
  return { url: data?.secure_url || data?.url || '' }
}
