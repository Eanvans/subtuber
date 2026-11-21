import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    // Chart.js is used by the lazy-loaded recording route.
    include: ['chart.js/auto']
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/img': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
