import { createRouter, createWebHistory } from 'vue-router'
import MainView from '@/views/MainView.vue'
import HistoryView from '@/views/HistoryView.vue'
import WalletView from '@/views/WalletView.vue'
import ErrorView from '@/views/ErrorView.vue'
import { useAuthStore } from '@/stores/auth'
import { useErrorStore } from '@/stores/error'

const routes = [
  {
    path: '/',
    name: 'main',
    component: MainView,
    meta: { requiresAuth: false, title: 'Trade BTC-USDT' },
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView,
    meta: { requiresAuth: true, title: 'Trade History' },
  },
  {
    path: '/wallet',
    name: 'wallet',
    component: WalletView,
    meta: { requiresAuth: true, title: 'Your Wallet' },
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

/**
 * Navigation guard to handle authentication and Telegram BackButton behavior.
 * @param {Object} to - The target route object.
 * @param {Object} from - The current route object.
 * @param {Function} next - The function to resolve navigation.
 */
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const errorStore = useErrorStore()
  const backButton = window.Telegram.WebApp.BackButton
  document.title = to.meta.title || 'Telegram Mini App'

  // Manage Telegram BackButton
  if (window.Telegram.WebApp.isVersionAtLeast('6.1')) {
    if (to.path === '/') {
      backButton.hide()
    } else {
      backButton.show()
      backButton.onClick(() => router.back())
    }
  }

  // Check authentication for routes requiring it
  if (to.meta.requiresAuth && !authStore.isConnected) {
    try {
      await authStore.verifyToken()
      if (!authStore.isConnected) {
        errorStore.setError('error.wallet_connect')
        return next({ name: 'main' }) // Redirect to main
      }
    } catch {
      errorStore.setError('error.wallet_connect')
      return next({ name: 'main' }) // Redirect to main
    }
  }

  next()
})
