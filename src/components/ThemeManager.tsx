import { useEffect } from 'react'
import { useAppSelector } from '../app/hooks'

const STORAGE_KEY = 'qlcl_theme'

export default function ThemeManager() {
  const mode = useAppSelector((s) => s.theme.mode)

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  return null
}
