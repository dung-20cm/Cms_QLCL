import { useAppSelector } from '../../app/hooks'
import { PERMISSION } from './permissions'
import type { PermissionSlug } from './permissions'

// Kiểm tra user hiện tại có quyền `slug` hay không (dựa trên list_permission trả về lúc đăng nhập).
export function useHasPermission(slug: PermissionSlug): boolean {
  return useAppSelector((s) => s.auth.permissions.some((p) => p.slug === slug))
}

// Có ít nhất 1 quyền trong danh sách (dùng gate menu/route theo nhiều role - map.jpg)
export function useHasAnyPermission(slugs: readonly PermissionSlug[]): boolean {
  return useAppSelector((s) => s.auth.permissions.some((p) => (slugs as readonly string[]).includes(p.slug)))
}

// Toàn bộ slug quyền GHI (tạo/sửa/xoá) hiện có trong hệ thống -- Admin giữ hết
// các slug này (cộng thêm XEM_TOAN_QUYEN_BAO_CAO_LICH); role "Lãnh đạo" KHÔNG
// giữ slug nào trong danh sách này (chỉ xem toàn viện, không thao tác).
const WRITE_PERMISSION_SLUGS: readonly PermissionSlug[] = [
  PERMISSION.TAO_TAI_KHOAN,
  PERMISSION.PHAN_QUYEN_TAI_KHOAN,
  PERMISSION.CAU_HINH_DOT_DANH_GIA,
  PERMISSION.CAU_HINH_PHONG_KHOA_KIEM_TRA,
  PERMISSION.DANH_GIA_CAC_KHOA,
  PERMISSION.QUAN_LY_ANH_5S_TAT_CA_KHOA,
  PERMISSION.PHAN_CONG_DANH_GIA,
  PERMISSION.QUAN_LY_BANG_KIEM_KHOA_MINH,
  PERMISSION.QUAN_LY_KHAC_PHUC_KHOA_MINH,
  PERMISSION.TAO_TAI_KHOAN_NHAN_VIEN,
  PERMISSION.LAM_DANH_GIA,
]

// true khi tài khoản đang đăng nhập là dạng "chỉ xem" (role Lãnh đạo): giữ
// quyền xem toàn viện (XEM_TOAN_QUYEN_BAO_CAO_LICH) nhưng không giữ bất kỳ
// quyền ghi nào ở trên. Dùng để ẩn nút Thêm/Sửa/Xoá ở MỌI trang thay vì phải
// check riêng từng permission ghi ở từng nơi.
export function useIsViewOnly(): boolean {
  const hasFullView = useHasPermission(PERMISSION.XEM_TOAN_QUYEN_BAO_CAO_LICH)
  const hasAnyWrite = useHasAnyPermission(WRITE_PERMISSION_SLUGS)
  return hasFullView && !hasAnyWrite
}
