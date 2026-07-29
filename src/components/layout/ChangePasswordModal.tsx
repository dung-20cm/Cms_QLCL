import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAppDispatch } from '../../app/hooks'
import { changePassword } from '../../features/auth/authSlice'
import { Modal, Field, inputCls, btnPrimary, btnSecondary } from '../ui/PageShell'
import { useToast } from '../../features/ui/useToast'

interface Props {
  open: boolean
  onClose: () => void
}

const emptyForm = { oldPassword: '', newPassword: '', confirmPassword: '' }

export default function ChangePasswordModal({ open, onClose }: Props) {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const [form, setForm] = useState(emptyForm)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function reset() {
    setForm(emptyForm)
    setShowOld(false)
    setShowNew(false)
    setShowConfirm(false)
    setError(null)
    setSubmitting(false)
    setSuccess(false)
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  function validate(): string | null {
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      return 'Vui lòng nhập đầy đủ cả 3 trường.'
    }
    if (form.newPassword.length < 6) {
      return 'Mật khẩu mới phải có ít nhất 6 ký tự.'
    }
    if (form.newPassword === form.oldPassword) {
      return 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    }
    if (form.newPassword !== form.confirmPassword) {
      return 'Xác nhận mật khẩu không khớp với mật khẩu mới.'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await dispatch(
        changePassword({ old_password: form.oldPassword, new_password: form.newPassword }),
      ).unwrap()
      setSuccess(true)
      toast.success('Đổi mật khẩu thành công!')
      setTimeout(() => {
        reset()
        onClose()
      }, 1200)
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Đổi mật khẩu thất bại. Vui lòng thử lại!'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Đổi mật khẩu"
      onClose={handleClose}
      footer={
        success ? undefined : (
          <>
            <button type="button" className={btnSecondary} onClick={handleClose} disabled={submitting}>
              Huỷ
            </button>
            <button type="submit" form="change-password-form" className={btnPrimary} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="animate-fade-in flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 size={40} className="text-green-500" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Đổi mật khẩu thành công!
          </p>
        </div>
      ) : (
        <form id="change-password-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              ⚠ {error}
            </div>
          )}
          <Field label="Mật khẩu hiện tại">
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${inputCls} w-full pr-9`}
                value={form.oldPassword}
                onChange={(e) => setForm((f) => ({ ...f, oldPassword: e.target.value }))}
                disabled={submitting}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowOld((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="Mật khẩu mới">
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${inputCls} w-full pr-9`}
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                disabled={submitting}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Field label="Xác nhận mật khẩu mới">
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`${inputCls} w-full pr-9`}
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                disabled={submitting}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
        </form>
      )}
    </Modal>
  )
}
