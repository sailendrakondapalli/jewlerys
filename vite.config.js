import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['recharts'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,

    allowedHosts: [
      'cod-unfixable-unsaid.ngrok-free.dev'
    ],

    hmr: true,

    watch: {
      usePolling: true,
      interval: 300,
    }
  }
})