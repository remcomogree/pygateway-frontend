import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: './dist'
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      },
      '/api/superadmin': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
        headers: {
          Origin: 'http://localhost:8002',
          Referer: 'http://localhost:8002/'
        }
      },
      '/api/csrf-token': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
        headers: {
          Origin: 'http://localhost:8002',
          Referer: 'http://localhost:8002/'
        }
      },
      '/api/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/health/, '/health')
      }
    }
  }
})
