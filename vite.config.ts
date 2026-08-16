import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // 开发模式联调：前端 /api 请求代理到本地 FastAPI 后端
      '/api': 'http://localhost:8000',
    },
    watch: {
      ignored: [
        '**/.chrome-profile-*/**',
        '**/dist/**',
        '**/vite-dev*.log',
        '**/vite-dev.pid',
      ],
    },
  },
  preview: { allowedHosts: true },
})
