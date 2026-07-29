import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
// Font tự lưu trữ trong bundle (thay vì gọi CDN fonts.googleapis.com lúc chạy)
// -- mạng nội bộ viện có thể chặn/timeout CDN ngoài, khiến chữ rơi về font hệ
// thống bất định giữa các máy (đây là nguyên nhân "lỗi font" trước đó). Be
// Vietnam Pro có bộ dấu tiếng Việt đầy đủ, dựng dấu đúng chuẩn.
import '@fontsource/be-vietnam-pro/300.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import './index.css'
import App from './App.tsx'
import { store } from './app/store'
import ThemeManager from './components/ThemeManager'

// Áp class 'dark' ngay trước khi React render lần đầu để tránh nháy sáng/tối (FOUC)
if (store.getState().theme.mode === 'dark') {
  document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeManager />
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
