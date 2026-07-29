import { useAppDispatch } from '../../app/hooks'
import { addToast } from './toastSlice'

// Thông báo Thành công/Lỗi dùng chung cho mọi hành động Thêm/Sửa/Xoá trong app
// -- hiện góc trên-phải, tự tắt sau 3s (xem ToastContainer.tsx).
export function useToast() {
  const dispatch = useAppDispatch()
  return {
    success: (message: string) => dispatch(addToast({ type: 'success', message })),
    error: (message: string) => dispatch(addToast({ type: 'error', message })),
  }
}
