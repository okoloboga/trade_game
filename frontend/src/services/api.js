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
    console.log('[api] Adding token to request:', {
      token: authStore.token,
      url: config.url,
      method: config.method,
      headersBefore: config.headers,
    });
    if (authStore.token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${authStore.token}`;
      console.log('[api] Added Authorization header:', config.headers.Authorization);
    }
    console.log('[api] Final request config:', {
      url: config.url,
      headers: config.headers,
      data: config.data,
    });
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
  async verifyToken(token) {
    try {
      const response = await api.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { valid: true, data: response.data };
    } catch (error) {
      return { valid: false, error: handleApiError(error) };
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
  async getTradeHistory(period = '1w') {
    try {
      const authStore = useAuthStore();
      console.log('[api] Fetching trade history for ton_address:', authStore.user?.ton_address);
      const response = await api.get('/stats/trades', {
        params: { ton_address: authStore.user?.ton_address, period },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getSummary(period = '1d') {
    try {
      const authStore = useAuthStore();
      console.log('[api] Fetching summary for ton_address:', authStore.user?.ton_address);
      const response = await api.get('/stats/summary', {
        params: { ton_address: authStore.user?.ton_address, period },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async getTransactions(period = '1w') {
    try {
      const authStore = useAuthStore();
      console.log('[api] Fetching transactions for ton_address:', authStore.user?.ton_address);
      const response = await api.get('/stats/transactions', {
        params: { ton_address: authStore.user?.ton_address, period },
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
  async buyTrade({ ton_address, amount, symbol }) {
    try {
      console.log('[apiService] Buying:', { ton_address, amount, symbol });
      const response = await api.post('/trades/buy', {
        ton_address,
        amount,
        symbol,
      });
      console.log('[apiService] Buy response:', response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  async sellTrade({ ton_address, amount, symbol }) {
    try {
      console.log('[apiService] Selling:', { ton_address, amount, symbol });
      const response = await api.post('/trades/sell', {
        ton_address,
        amount,
        symbol,
      });
      console.log('[apiService] Sell response:', response.data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
