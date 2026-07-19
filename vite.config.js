import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './frontend/src/test/setup.js',
  },
  server: {
    port: 3000,
    open: true
  }
}) 