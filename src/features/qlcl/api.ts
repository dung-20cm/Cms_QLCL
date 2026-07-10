import { apiClient, ApiError } from "../../lib/axiosClient";
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
} from "./types";

// Backend tra { statusCode, message, data } -- axiosClient da reject khi statusCode != 200
interface Envelope<T> {
  data: T;
}

type Query = Record<string, string | number | undefined>;

function clean(params?: Query): Query | undefined {
  if (!params) return undefined;
  const out: Query = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
}

async function getList<T>(
  entity: string,
  params?: Query,
): Promise<ListData<T>> {
  const res = await apiClient.get<Envelope<ListData<T>>>(
    `/api/${entity}/get-list-${entity}`,
    {
      params: clean(params),
    },
  );
  return res.data.data;
}

// -- Danh muc --
export const fetchKhoaList = () => getList<Khoa>("khoa");
export const fetchVitriTypeList = () => getList<VitriType>("vitri-type");
export const fetchChecklistItems = (vitri_type_id?: number) =>
  getList<ChecklistItem>("checklist-item", { vitri_type_id });
export const fetchVitriChiTietList = (params?: {
  khoa_id?: number;
  vitri_type_id?: number;
}) => getList<VitriChiTiet>("vitri-chi-tiet", params);

export async function fetchUserList(): Promise<ListData<UserLite>> {
  const res = await apiClient.get<Envelope<ListData<UserLite>>>(
    "/api/user/get-list-user",
  );
  return res.data.data;
}

// -- Quan ly tai khoan (Admin -- CRUD user + gan role) --
export async function fetchUserListFull(params?: {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
}): Promise<ListData<UserFull>> {
  const res = await apiClient.get<Envelope<ListData<UserFull>>>(
    "/api/user/get-list-user",
    {
      params: clean(params),
    },
  );
  return res.data.data;
}

export const fetchRoleList = () => getList<Role>("role"); // GET /api/role/get-list-role

// -- Cau hinh: loai vi tri danh gia (CRUD -- Admin) --
export async function createUpdateVitriType(payload: {
  id?: number;
  ten_vitri: string;
  thu_tu?: number;
  active?: number;
}): Promise<VitriType> {
  const res = await apiClient.post<Envelope<VitriType>>(
    "/api/vitri-type/create-update-vitri-type",
    payload,
  );
  return res.data.data;
}

export async function deleteVitriType(id: number): Promise<void> {
  await apiClient.post(`/api/vitri-type/delete-vitri-type/${id}`);
}

// -- Cau hinh: tieu chi bang kiem (checklist_item -- Admin) --
export async function createUpdateChecklistItem(payload: {
  id?: number;
  // Bat buoc khi tao moi (khong co id); khi sua (co id) co the bo qua, giu nguyen gia tri cu
  vitri_type_id?: number;
  s_id?: string;
  s_name?: string;
  s_color?: string;
  s_lt?: string;
  sub?: string | null;
  tc?: string;
  thu_tu?: number;
  active?: number;
}): Promise<ChecklistItem> {
  const res = await apiClient.post<Envelope<ChecklistItem>>(
    "/api/checklist-item/create-update-checklist-item",
    payload,
  );
  return res.data.data;
}

export async function deleteChecklistItem(id: number): Promise<void> {
  await apiClient.post(`/api/checklist-item/delete-checklist-item/${id}`);
}

// -- Cau hinh: dot danh gia (dot_danh_gia -- Admin) --
export const fetchDotDanhGiaList = (params?: { trang_thai?: string }) =>
  getList<DotDanhGia>("dot-danh-gia", params); // GET /api/dot-danh-gia/get-list-dot-danh-gia

export async function createUpdateDotDanhGia(payload: {
  id?: number;
  ten_dot: string;
  tu_ngay?: string | null;
  den_ngay?: string | null;
  mo_ta?: string | null;
  trang_thai?: string;
}): Promise<DotDanhGia> {
  const res = await apiClient.post<Envelope<DotDanhGia>>(
    "/api/dot-danh-gia/create-update-dot-danh-gia",
    payload,
  );
  return res.data.data;
}

export async function deleteDotDanhGia(id: number): Promise<void> {
  await apiClient.post(`/api/dot-danh-gia/delete-dot-danh-gia/${id}`);
}

// -- Cau hinh: khoa - vi tri (vitri_chi_tiet -- Admin) --
export async function createUpdateVitriChiTiet(payload: {
  id?: number;
  khoa_id: number;
  vitri_type_id: number;
  ma_vitri: string;
  ghi_chu?: string | null;
}): Promise<VitriChiTiet> {
  const res = await apiClient.post<Envelope<VitriChiTiet>>(
    "/api/vitri-chi-tiet/create-update-vitri-chi-tiet",
    payload,
  );
  return res.data.data;
}

export async function deleteVitriChiTiet(id: number): Promise<void> {
  await apiClient.post(`/api/vitri-chi-tiet/delete-vitri-chi-tiet/${id}`);
}

export async function createUpdateUser(
  payload: UserUpsertPayload,
): Promise<UserFull> {
  const res = await apiClient.post<Envelope<UserFull>>(
    "/api/user/update_user",
    payload,
  );
  return res.data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.post(`/api/user/delete_user?id=${id}`);
}

// -- Danh gia --
export const fetchDanhGiaList = (params?: {
  khoa_id?: number;
  page?: number;
  limit?: number;
}) => getList<DanhGia>("danh-gia", params);

// Diem tung nhom S (S1..S5) do backend tinh san trong get-danh-gia/:id
export interface SScore {
  id: string; // "S1".."S5"
  name: string;
  color: string;
  lt: string;
  ok: number;
  total: number;
  pct: number;
}

export async function fetchDanhGiaById(
  id: number,
): Promise<DanhGia & { sScores: SScore[] }> {
  const res = await apiClient.get<Envelope<DanhGia & { sScores: SScore[] }>>(
    `/api/danh-gia/get-danh-gia/${id}`,
  );
  return res.data.data;
}

export async function createDanhGia(
  payload: CreateDanhGiaPayload,
): Promise<DanhGia> {
  const res = await apiClient.post<Envelope<DanhGia>>(
    "/api/danh-gia/create-danh-gia",
    payload,
  );
  return res.data.data;
}

// -- Khac phuc --
export const fetchKhacPhucList = (params?: { trang_thai?: string }) =>
  getList<KhacPhuc>("khac-phuc", params);

export async function createUpdateKhacPhuc(
  payload: Partial<KhacPhuc>,
): Promise<KhacPhuc> {
  const res = await apiClient.post<Envelope<KhacPhuc>>(
    "/api/khac-phuc/create-update-khac-phuc",
    payload,
  );
  return res.data.data;
}

// -- Lich phan cong --
export const fetchLichPhanCongList = () =>
  getList<LichPhanCong>("lich-phan-cong");

export async function createUpdateLichPhanCong(
  payload: Partial<LichPhanCong>,
): Promise<LichPhanCong> {
  const res = await apiClient.post<Envelope<LichPhanCong>>(
    "/api/lich-phan-cong/create-update-lich-phan-cong",
    payload,
  );
  return res.data.data;
}

// -- Anh 5S theo tuan (nhom Zalo) --
export const fetchAnh5sTuanList = () => getList<Anh5sTuan>("anh-5s-tuan");

export interface Anh5sTuanPayload {
  id?: number;
  khoa_id: number;
  tuan: string;
  so_luong_anh: number;
  chat_luong: string;
  ghi_chu?: string;
  vi_tri: number[]; // danh sach vitri_type_id
  active?: number;
}

export async function createUpdateAnh5sTuan(
  payload: Anh5sTuanPayload,
): Promise<Anh5sTuan> {
  const { vi_tri, ...rest } = payload;
  const res = await apiClient.post<Envelope<Anh5sTuan>>(
    "/api/anh-5s-tuan/create-update-anh-5s-tuan",
    // Backend nhan field `vitri_type_ids` (giu them vi_tri de tuong thich nguoc)
    { ...rest, vitri_type_ids: vi_tri },
  );
  return res.data.data;
}

// -- Xuat bao cao Nhom Zalo 5S (HTML in/luu PDF + Word .doc) --
// Backend tra file truc tiep (khong boc JSON); neu middleware auth tra loi
// JSON {signal:0,...} voi HTTP 200 thi blob se la JSON -- can tu kiem tra.
async function downloadBaoCaoZalo(
  kind: "html" | "word",
  tuan?: string,
): Promise<void> {
  const res = await apiClient.get<Blob>(
    `/api/anh-5s-tuan/export-bao-cao-${kind}`,
    {
      params: clean({ tuan }),
      responseType: "blob",
    },
  );
  const blob = res.data;
  if (blob.type.includes("application/json")) {
    const body = JSON.parse(await blob.text()) as { message?: string };
    throw new ApiError(body.message || "Xuat bao cao that bai");
  }
  // Lay ten file tu header Content-Disposition: attachment; filename*=UTF-8''...
  const cd = String(res.headers["content-disposition"] || "");
  const m = cd.match(/filename\*=UTF-8''([^;]+)/);
  const fallback = `BaoCaoZalo5S_${(tuan || "TongHop").replace(/-/g, "")}.${kind === "word" ? "doc" : "html"}`;
  const filename = m ? decodeURIComponent(m[1]) : fallback;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportBaoCaoZaloHTML = (tuan?: string) =>
  downloadBaoCaoZalo("html", tuan);
export const exportBaoCaoZaloWord = (tuan?: string) =>
  downloadBaoCaoZalo("word", tuan);

// -- Photo gallery (anh minh chung danh gia + anh 5S gui doc lap) --
export const fetchPhotoGalleryList = (params?: {
  khoa_id?: number;
  vitri_type_id?: number;
  ket_qua?: string;
  tu_ngay?: string;
  den_ngay?: string;
  active?: string;
}) => getList<PhotoGallery>("photo-gallery", params);

export interface CreatePhotoGalleryPayload {
  // Cach 1: gan vao 1 luot danh gia (tu Bang kiem)
  danh_gia_id?: number;
  checklist_item_id?: number | null;
  // Cach 2: gui anh doc lap -- bat buoc khoa_id
  khoa_id?: number;
  vitri_type_id?: number | null;
  ngay_chup?: string | null;
  nguoi_gui_id?: number | null;
  ket_qua?: string | null;
  ghi_chu?: string | null;
  // Chung
  url_anh: string;
  ten_file?: string;
  mime_type?: string;
}

export async function createPhotoGallery(
  payload: CreatePhotoGalleryPayload,
): Promise<PhotoGallery> {
  const res = await apiClient.post<Envelope<PhotoGallery>>(
    "/api/photo-gallery/create-photo-gallery",
    payload,
  );
  return res.data.data;
}

export async function updatePhotoGallery(payload: {
  id: number;
  khoa_id?: number;
  vitri_type_id?: number | null;
  ngay_chup?: string | null;
  nguoi_gui_id?: number | null;
  ket_qua?: string | null;
  ghi_chu?: string | null;
}): Promise<PhotoGallery> {
  const res = await apiClient.post<Envelope<PhotoGallery>>(
    "/api/photo-gallery/update-photo-gallery",
    payload,
  );
  return res.data.data;
}

export async function deletePhotoGallery(id: number): Promise<void> {
  await apiClient.post(`/api/photo-gallery/delete-photo-gallery/${id}`);
}

// Upload anh len Cloudinary qua backend, tra ve url
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("image", file);
  const res = await apiClient.post<
    Envelope<{ url?: string; secure_url?: string } | string>
  >("/api/upload/uploadImage", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const data = res.data.data;
  if (typeof data === "string") return { url: data };
  return { url: data?.secure_url || data?.url || "" };
}
