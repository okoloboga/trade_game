import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useErrorStore } from '@/stores/error'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const publicEndpoints = ['/auth/login', '/challenge/generate', '/challenge/verify']

// Interceptor to add Authorization header
api.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  if (authStore.isConnected && authStore.token && !publicEndpoints.includes(config.url)) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// Error handling
const handleApiError = (error) => {
  const errorStore = useErrorStore()
  let message = 'An error occurred'
  let code = error.response?.status || 500

  if (error.response?.data) {
    message = error.response.data.message || error.response.data.error || message
  } else if (error.message) {
    message = error.message
  }

  errorStore.setError(message)

  if (code === 401) {
    const authStore = useAuthStore()
    authStore.logout()
    // Optionally redirect to login
  }

  return Promise.reject({ code, message })
}

const apiService = {
  // Challenge Module
  async generateChallenge(walletAddress) {
    try {
      const response = await api.get('/challenge/generate', {
        params: { walletAddress },
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async verifyProof({ walletAddress, tonProof, account }) {
    try {
      const response = await api.post('/challenge/verify', {
        walletAddress,
        tonProof,
        account,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Auth Module
  async login(walletAddress) {
    try {
      const response = await api.post('/auth/login', { walletAddress })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Market Module
  async getCandles(instId = 'BTC-USDT', bar = '5m') {
    try {
      const response = await api.get('/market/candles', {
        params: { instId, bar },
      })
      console.log('API candles response:', response.data);
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async getCurrentPrice(instId = 'BTC-USDT') {
    try {
      const response = await api.get('/market/ticker', {
        params: { instId },
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async getTonPrice() {
    try {
      const response = await api.get('/market/ton-price')
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Stats Module
  async getTradeHistory(period = '1w') {
    try {
      const authStore = useAuthStore()
      const response = await api.get('/stats/trades', {
        params: { userId: authStore.user?.id, period },
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async getSummary(period = '1d') {
    try {
      const authStore = useAuthStore()
      const response = await api.get('/stats/summary', {
        params: { userId: authStore.user?.id, period },
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Tokens Module
  async withdrawTokens(amount) {
    try {
      const authStore = useAuthStore()
      const response = await api.post('/tokens/withdraw', {
        userId: authStore.user?.id,
        amount,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Trades Module
  async placeTrade({ type, amount, symbol = 'BTC-USDT' }) {
    try {
      const authStore = useAuthStore()
      const response = await api.post('/trades/place', {
        userId: authStore.user?.id,
        instrument: symbol,
        type,
        amount,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async cancelTrade(tradeId) {
    try {
      const response = await api.post('/trades/cancel', { tradeId })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Transactions Module
  async deposit(amount, txHash) {
    try {
      const authStore = useAuthStore()
      const response = await api.post('/transactions/deposit', {
        userId: authStore.user?.id,
        amount,
        txHash,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async withdraw(amount) {
    try {
      const authStore = useAuthStore()
      const response = await api.post('/transactions/withdraw', {
        userId: authStore.user?.id,
        amount,
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  // Wallet Module
  async getWalletData() {
    try {
      const response = await api.get('/wallet')
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },

  async getTransactions() {
    try {
      const authStore = useAuthStore()
      const response = await api.get('/transactions', {
        params: { userId: authStore.user?.id },
      })
      return response.data
    } catch (error) {
      return handleApiError(error)
    }
  },
}

export default apiService
