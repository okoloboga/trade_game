import { createRouter, createWebHistory } from 'vue-router'
import MainView from '@/views/MainView.vue'
import HistoryView from '@/views/HistoryView.vue'
import ErrorView from '@/views/ErrorView.vue'
import { useAuthStore } from '@/stores/auth'
import { useErrorStore } from '@/stores/error'

const routes = [
  {
    path: '/',
    name: 'main',
    component: MainView,
    meta: { requiresAuth: false, title: 'Trade BTC-USDT' }, // Убрано requiresAuth
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: { requiresAuth: true, title: 'Trade History' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: ErrorView,
    meta: { title: 'Page Not Found' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const errorStore = useErrorStore()
  const backButton = window.Telegram.WebApp.BackButton
  document.title = to.meta.title || 'Telegram Mini App'

  // Управление Telegram BackButton
  if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
    if (to.path === '/') {
      backButton.hide()
    } else {
      backButton.show()
      backButton.onClick(() => router.back())
    }
  }

  // Проверка авторизации только для маршрутов с requiresAuth
  if (to.meta.requiresAuth && !authStore.isConnected) {
    try {
      await authStore.verifyToken()
      if (!authStore.isConnected) {
        errorStore.setError('error.wallet_connect')
        return next({ name: 'main' }) // Перенаправляем на главную
      }
    } catch {
      errorStore.setError('error.wallet_connect')
      return next({ name: 'main' }) // Перенаправляем на главную
    }
  }

  next()
})
