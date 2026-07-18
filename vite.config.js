import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: 'all',
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  },
  preview: {
    port: 5173,
    strictPort: true,
    allowedHosts: 'all',
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
  }
})
