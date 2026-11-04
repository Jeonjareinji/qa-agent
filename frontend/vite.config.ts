import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Alamat yang boleh mengakses server dev dan preview lewat tunnel (mis. Cloudflare Quick Tunnel).
const allowedHosts = ['.trycloudflare.com']

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts,
    // Disiapkan untuk nanti, belum dipakai: backend akan berjalan di port 8787.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  preview: { host: '0.0.0.0', allowedHosts },
})
