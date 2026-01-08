import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Target our Python FastAPI backend
  const BACKEND_URL = 'http://localhost:8000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Proxy API requests to FastAPI
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false
        },
        // Proxy our streaming chat endpoint
        '/stream': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false
        },
        // Proxy WebSocket for shell
        '/shell': {
          target: 'http://localhost:8000',
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path
        }
      }
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge']
          }
        }
      }
    }
  }
})
