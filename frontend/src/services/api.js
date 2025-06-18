import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useErrorStore } from '@/stores/error';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://trade.ruble.website/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    console.log('[api] Adding token to request:', authStore.token, 'URL:', config.url);
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log('API response:', response.config.url, response.data);
    return response;
  },
  (error) => {
    console.error('API error:', error.response?.data || error.message, 'URL:', error.config?.url);
    if (error.response?.status === 401) {
      console.log('[api] Handling 401, URL:', error.config?.url, 'token before logout:', useAuthStore().token);
      const authStore = useAuthStore();
      // Избегаем logout для /auth/login
      if (error.config?.url !== '/auth/login') {
        authStore.logout();
        useErrorStore().setError('Session expired');
      }
    }
    return Promise.reject(error);
  }
);

function handleApiError(error) {
  const errorStore = useErrorStore();
  const message = error.response?.data?.message || error.message || 'Unknown error';
  errorStore.setError(message);
  return { error: message, status: error.response?.status || 500 };
}

export default {
  async generateChallenge(clientId) {
    try {
      const response = await api.get('/challenge/generate', {
        params: { clientId },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async verifyProof(data) {
    try {
      const response = await api.post('/challenge/verify', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async login(data) {
    try {
      const response = await api.post('/auth/login', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getUserBalance(tonAddress) {
    try {
      const response = await api.get(`/users/${tonAddress}/balance`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getCandles(instId = 'TON-USDT', bar = '5m') {
    try {
      const response = await api.get('/market/candles', {
        params: { instId, bar },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getCurrentPrice(instId = 'TON-USDT') {
    try {
      const response = await api.get('/market/ticker', {
        params: { instId },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getTonPrice() {
    try {
      const response = await api.get('/market/ticker', {
        params: { instId: 'TON-USDT' },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getTransactions() {
    try {
      const authStore = useAuthStore();
      const response = await api.get('/stats/trades', {
        params: { userId: authStore.user?.id, period: '1w' },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async deposit({ tonAddress, amount, txHash }) {
    try {
      const response = await api.post('/transactions/deposit', {
        tonAddress,
        amount,
        txHash,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async withdraw({ tonAddress, amount }) {
    try {
      console.log('[apiService] Withdrawing:', { tonAddress, amount });
      const response = await api.post('/transactions/withdraw', {
        tonAddress,
        amount,
      });
      console.log('[apiService] Withdraw response:', response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async withdrawTokens({ tonAddress, amount }) {
    try {
      const response = await api.post('/tokens/withdraw', {
        tonAddress,
        amount,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
