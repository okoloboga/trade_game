import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify';
import 'vuetify/styles'; // Импорт стилей Vuetify
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { createPinia } from 'pinia'
import { router } from './router'
import { WebApp } from '@twa-dev/sdk'
import { BackButton } from '@twa-dev/sdk';
import { useAppStore } from './stores/app'
import { useAuthStore } from './stores/auth'
import { useWalletStore } from './stores/wallet'

if (WebApp.isVersionAtLeast('6.0')) {
  WebApp.ready()
  WebApp.expand()
}

// Инициализация Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark', // Указываем тёмную тему, как в вашем проекте
  },
});

const app = createApp(App)
app.use(vuetify).use(createPinia()).use(router)

// Инициализация сторов
const appStore = useAppStore()
const authStore = useAuthStore()
const walletStore = useWalletStore()

// Глобальная загрузка
appStore.setLoading(true)
async function initializeApp() {
  try {
    if (authStore.token) {
      await authStore.verifyToken() // Проверяем токен (нужен метод в authStore)
      if (authStore.isConnected) {
        await walletStore.fetchWalletData() // Загружаем данные кошелька
      }
    }
  } catch (error) {
    console.error('Initialization error:', error)
    authStore.logout() // Очищаем сессию при ошибке
  } finally {
    appStore.setLoading(false)
  }
}
initializeApp()

router.beforeEach((to, from, next) => {
  if (to.path === '/') {
    BackButton.hide()
  } else {
    BackButton.show()
    BackButton.onClick(() => router.back())
  }
  next()
})

app.mount('#app')
