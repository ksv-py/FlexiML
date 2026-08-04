import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // Preview server options (used by `vite preview` / production preview)
  preview: {
    host: true,
    port: 4173,
    // Allow the Railway production host (update if your domain differs)
    allowedHosts: ['frontend-production-59cad.up.railway.app', 'localhost', '127.0.0.1'],
  },
})
