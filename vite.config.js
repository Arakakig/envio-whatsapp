import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      'global': 'globalThis',
    },
  },
  optimizeDeps: {
    include: ['whatsapp-web.js'],
  },
  server: {
    port: 5173,
    host: true,
  },
})
