import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import { router } from './router'
import WebApp from '@twa-dev/sdk'
import { createI18n } from 'vue-i18n'
import { Buffer } from 'buffer';

// Import translations
import en from './locales/en.json'
import ru from './locales/ru.json'

// Telegram WebApp initialization
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
      ready: () => {},
      expand: () => {},
      BackButton: {
        show: () => {},
        hide: () => {},
        onClick: (callback) => {}
      }
    }
  }
}

window.Buffer = window.Buffer || Buffer;

// Vuetify initialization
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

// vue-i18n initialization
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
  legacy: false
})

// Create app
const app = createApp(App)
const pinia = createPinia()

// Use plugins
app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(i18n)

// Mount app
app.mount('#app')

/**
 * Initializes the application by verifying the auth token and fetching wallet data.
 */
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
