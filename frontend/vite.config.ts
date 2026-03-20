import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDemo = env.VITE_DEMO === 'true' || process.env.VITE_DEMO === 'true'

  return {
    plugins: [vue()],
    define: {
      // Ensure VITE_DEMO is available at runtime even if mode loading fails
      ...(isDemo ? { 'import.meta.env.VITE_DEMO': JSON.stringify('true') } : {}),
    },
    server: {
      proxy: isDemo ? {} : {
        '/api': 'http://localhost:3000',
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true,
        },
      },
    },
  }
})
