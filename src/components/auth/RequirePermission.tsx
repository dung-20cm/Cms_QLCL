import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useHasAnyPermission } from '../../features/auth/usePermission'
import type { PermissionSlug } from '../../features/auth/permissions'

interface RequirePermissionProps {
  // 1 slug hoặc danh sách slug — chỉ cần có 1 quyền là được xem (anyOf)
  slug: PermissionSlug | readonly PermissionSlug[]
  children: ReactNode
}

// Ẩn nội dung trang nếu user không có permission slug tương ứng (list_permission trả về lúc login).
export default function RequirePermission({ slug, children }: RequirePermissionProps) {
  const slugs = Array.isArray(slug) ? slug : [slug as PermissionSlug]
  const allowed = useHasAnyPermission(slugs)

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center dark:border-gray-700 dark:bg-gray-900">
        <ShieldAlert className="mb-3 text-gray-300 dark:text-gray-600" size={32} />
        <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Không có quyền truy cập</h1>
        <p className="mt-1 text-sm text-gray-400">Tài khoản của bạn không có quyền xem trang này.</p>
      </div>
    )
  }

  return <>{children}</>
}
