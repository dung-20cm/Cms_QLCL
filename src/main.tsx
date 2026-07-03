import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
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
