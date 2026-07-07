import { useAppSelector } from '../../app/hooks'
import type { PermissionSlug } from './permissions'

// Kiểm tra user hiện tại có quyền `slug` hay không (dựa trên list_permission trả về lúc đăng nhập).
export function useHasPermission(slug: PermissionSlug): boolean {
  return useAppSelector((s) => s.auth.permissions.some((p) => p.slug === slug))
}

// Có ít nhất 1 quyền trong danh sách (dùng gate menu/route theo nhiều role - map.jpg)
export function useHasAnyPermission(slugs: readonly PermissionSlug[]): boolean {
  return useAppSelector((s) => s.auth.permissions.some((p) => (slugs as readonly string[]).includes(p.slug)))
}
