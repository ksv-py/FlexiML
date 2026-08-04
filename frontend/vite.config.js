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
    // Allow the Railway-assigned host used in production preview
    // Add specific host to avoid blocking requests in Vite preview runtime
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: [
      'frontend-production-59cad.up.railway.app',
      'localhost',
    ],
  },
})
