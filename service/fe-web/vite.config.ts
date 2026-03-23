import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.BFF_URL ?? 'http://localhost:8880',
          changeOrigin: true,
        },
        '/v1': {
          target: env.OTEL_COLLECTOR_URL ?? 'http://localhost:4318',
          changeOrigin: true,
        },
      },
    },
  }
})