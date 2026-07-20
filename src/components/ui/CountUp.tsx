import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

// Đếm số chạy từ giá trị trước đó lên giá trị mới mỗi khi `value` đổi (mount
// trang lần đầu tính từ 0). Dùng requestAnimationFrame + easeOutCubic thay vì
// setInterval để mượt và tự dừng đúng khung hình cuối.
export default function CountUp({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const to = Number.isFinite(value) ? value : 0
    if (from === to) {
      setDisplay(to)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    raf = requestAnimationFrame(tick)
    // rAF không chạy khi tab ở nền (trình duyệt tự tạm dừng để tiết kiệm pin)
    // -- đặt lưới an toàn bằng setTimeout để luôn chốt đúng giá trị cuối cùng
    // kể cả khi animation bị treo giữa chừng.
    const safety = setTimeout(() => {
      setDisplay(to)
      fromRef.current = to
    }, duration + 100)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(safety)
    }
  }, [value, duration])

  const text =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('vi-VN')

  return (
    <span className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  )
}
