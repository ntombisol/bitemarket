import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/registry': 'http://localhost:4021',
      '/query': 'http://localhost:4021',
      '/data': 'http://localhost:4021',
      '/events': 'http://localhost:4021',
      '/health': 'http://localhost:4021',
      '/faucet': 'http://localhost:4021',
    },
  },
})
