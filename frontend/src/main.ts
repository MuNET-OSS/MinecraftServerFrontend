import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './style.css'
import App from './App.vue'
import router from './router'

async function bootstrap() {
  // Demo mode — mock all API calls with fake data, no backend needed
  if (import.meta.env.VITE_DEMO === 'true') {
    const { initDemoMode } = await import('./mock/index')
    initDemoMode()
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(naive)
  app.mount('#app')
}

bootstrap()
