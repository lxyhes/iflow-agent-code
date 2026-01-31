import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Target our Python FastAPI backend
  const BACKEND_URL = 'http://localhost:8000';
  const BACKEND_WS_URL = 'ws://localhost:8000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // ===== Interview API (最高优先级) =====
        // WebSocket for interview - 直接代理，不重写
        '/api/interview/ws': {
          target: BACKEND_WS_URL,
          ws: true,
          changeOrigin: true,
          secure: false
        },
        // Interview REST API endpoints - 直接代理，不重写
        // 后端已经有 /api/interview 路由
        '/api/interview': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false
        },
        // Proxy WebSocket for shell
        '/shell': {
          target: BACKEND_WS_URL,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path
        },
        // 工作流相关 API
        '/api/workflows': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false
        },
        // 前端服务器 API 路由（认证、项目、设置、用户）
        '/api/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/api/settings': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        '/api/user': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        // 后端 Python FastAPI 路由（其他所有 /api 请求）
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
