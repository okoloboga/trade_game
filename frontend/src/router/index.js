import { createRouter, createWebHistory } from 'vue-router'
import MainView from '@/views/MainView.vue'
import HistoryView from '@/views/HistoryView.vue'
import ErrorView from '@/views/ErrorView.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'main',
    component: MainView,
    meta: { requiresAuth: true, title: 'Trade BTC-USDT' },
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
  document.title = to.meta.title || 'Telegram Mini App'

  if (to.meta.requiresAuth && !authStore.isConnected) {
    try {
      await authStore.verifyToken()
      if (!authStore.isConnected) {
        return next({ name: 'main' }) // Перенаправление на главную
      }
    } catch {
      return next({ name: 'main' })
    }
  }
  next()
})
