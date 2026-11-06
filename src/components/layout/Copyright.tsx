import { CircleCheck } from "lucide-react";

// Dòng bản quyền dùng chung (trang đăng nhập + khung chính sau đăng nhập).
export default function Copyright({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 dark:text-gray-500 ${className}`}
    >
      <CircleCheck size={14} className="shrink-0" aria-hidden="true" />
      <span>Bản quyền Phòng Công Nghệ Thông Tin</span>
    </p>
  );
}
