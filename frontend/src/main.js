import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import { router } from './router'
import WebApp from '@twa-dev/sdk'
import { TonConnectUIPlugin } from '@townsquarelabs/ui-vue'
import { createI18n } from 'vue-i18n'
import { Buffer } from 'buffer';

// Импорт переводов
import en from './locales/en.json'
import ru from './locales/ru.json'

// Telegram WebApp инициализация
if (window.Telegram?.WebApp?.isVersionAtLeast?.('6.0')) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand()
} else {
  console.warn('Telegram WebApp is not available')
}

if (!window.Telegram?.WebApp) {
  console.warn('Running outside Telegram, mocking WebApp')
  window.Telegram = {
    WebApp: {
      isVersionAtLeast: () => true,
      ready: () => console.log('Mock WebApp ready'),
      expand: () => console.log('Mock WebApp 1expand'),
      BackButton: {
        show: () => console.log('Mock BackButton show'),
        hide: () => console.log('Mock BackButton hide'),
        onClick: (callback) => console.log('Mock BackButton onClick', callback)
      }
    }
  }
}

window.Buffer = window.Buffer || Buffer;

// Vuetify инициализация
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          background: '#000000',
          surface: '#1e1e1e',
        }
      }
    }
  }
})

// Инициализация vue-i18n
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
  legacy: false
})

// Создаем приложение
const app = createApp(App)
const pinia = createPinia()

// Подключаем плагины
app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(TonConnectUIPlugin, {
  manifestUrl: `${import.meta.env.VITE_APP_URL}/manifest.json`
})
app.use(i18n)

// Монтируем приложение
app.mount('#app')

// Инициализация после монтирования
async function initializeApp() {
  try {
    const { useAppStore } = await import('./stores/app')
    const { useAuthStore } = await import('./stores/auth')
    const { useWalletStore } = await import('./stores/wallet')
    const appStore = useAppStore()
    const authStore = useAuthStore()
    const walletStore = useWalletStore()
    appStore.setLoading(true)
    if (authStore.token) {
      await authStore.verifyToken()
      if (authStore.isConnected) {
        await walletStore.fetchWalletData()
      }
    }
  } catch (error) {
    console.error('Initialization error:', error)
    const { useAuthStore } = await import('./stores/auth')
    const authStore = useAuthStore()
    authStore.logout()
  } finally {
    const { useAppStore } = await import('./stores/app')
    const appStore = useAppStore()
    appStore.setLoading(false)
  }
}

initializeApp()
