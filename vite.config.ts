import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // host: true -- lắng nghe trên mọi network interface (0.0.0.0), không chỉ
  // localhost, để máy khác trong mạng LAN vào được qua http://<ip-lan>:5173
  server: {
    host: true,
  },
})
