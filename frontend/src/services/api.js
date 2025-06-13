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
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorStore = useErrorStore();
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
      errorStore.setError('Session expired');
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
  async generateChallenge(walletAddress) {
    try {
      const response = await api.get('/challenge/generate', {
        params: { walletAddress },
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
  async getTonPrice() {
    try {
      const response = await api.get('/market/ticker', {
        params: { instId: 'TON-USD' },
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
  async deposit(amount, txHash) {
    try {
      const authStore = useAuthStore();
      const response = await api.post('/transactions/deposit', {
        userId: authStore.user?.id,
        amount,
        txHash,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async withdraw(amount) {
    try {
      const authStore = useAuthStore();
      const response = await api.post('/transactions/withdraw', {
        userId: authStore.user?.id,
        amount,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async withdrawTokens(amount) {
    try {
      const authStore = useAuthStore();
      const response = await api.post('/tokens/withdraw', {
        userId: authStore.user?.id,
        amount,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
