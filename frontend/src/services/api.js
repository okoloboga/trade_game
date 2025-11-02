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
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API error:', error.response?.data || error.message, 'URL:', error.config?.url);
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      if (error.config?.url !== '/auth/login') {
        authStore.logout();
        useErrorStore().setError('Session expired');
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Handles API errors by setting an error message in the error store.
 * @param {Object} error - The error object from the API request.
 * @returns {Object} An object containing the error message and status.
 */
function handleApiError(error) {
  const errorStore = useErrorStore();
  const message = error.response?.data?.message || error.message || 'Unknown error';
  errorStore.setError(message);
  return { error: message, status: error.response?.status || 500 };
}

/**
 * Generates a challenge for TON proof authentication.
 * @param {string} clientId - The client ID for the challenge.
 * @returns {Promise<Object>} The challenge response data.
 */
async function generateChallenge(clientId) {
  try {
    const response = await api.get('/challenge/generate', {
      params: { clientId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Verifies a TON proof challenge.
 * @param {Object} data - The data containing the TON proof.
 * @returns {Promise<Object>} The verification response data.
 */
async function verifyProof(data) {
  try {
    const response = await api.post('/challenge/verify', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Logs in a user with TON wallet credentials.
 * @param {Object} data - The login data including TON address and proof.
 * @returns {Promise<Object>} The login response data.
 */
async function login(data) {
  try {
    const response = await api.post('/auth/login', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Verifies the validity of a JWT token.
 * @param {string} token - The JWT token to verify.
 * @returns {Promise<Object>} An object indicating if the token is valid and the response data.
 */
async function verifyToken(token) {
  try {
    const response = await api.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { valid: true, data: response.data };
  } catch (error) {
    return { valid: false, error: handleApiError(error) };
  }
}

/**
 * Retrieves the balance for a user by their TON address.
 * @param {string} tonAddress - The TON address of the user.
 * @returns {Promise<Object>} The user's balance data.
 */
async function getUserBalance(tonAddress) {
  try {
    const response = await api.get(`/users/${tonAddress}/balance`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetches candlestick data for a trading pair.
 * @param {string} [instId='TON-USDT'] - The trading pair ID.
 * @param {string} [bar='5m'] - The candlestick interval.
 * @returns {Promise<Object>} The candlestick data.
 */
async function getCandles(instId = 'TON-USDT', bar = '5m') {
  try {
    const response = await api.get('/market/candles', {
      params: { instId, bar },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetches the current price for a trading pair.
 * @param {string} [instId='TON-USDT'] - The trading pair ID.
 * @returns {Promise<Object>} The current price data.
 */
async function getCurrentPrice(instId = 'TON-USDT') {
  try {
    const response = await api.get('/market/ticker', {
      params: { instId },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetches the current TON price.
 * @returns {Promise<Object>} The TON price data.
 */
async function getTonPrice() {
  try {
    const response = await api.get('/market/ticker', {
      params: { instId: 'TON-USDT' },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetches trade history for the authenticated user.
 * @param {string} [period='1w'] - The time period for the trade history.
 * @returns {Promise<Object>} The trade history data.
 */
async function getTradeHistory(period = '1w') {
  try {
    const authStore = useAuthStore();
    const response = await api.get('/stats/trades', {
      params: { ton_address: authStore.user?.ton_address, period },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetches a summary of trading statistics for the authenticated user.
 * @param {string} [period='1d'] - The time period for the summary.
 * @returns {Promise<Object>} The trading summary data.
 */
async function getSummary(period = '1d') {
  try {
    const authStore = useAuthStore();
    const response = await api.get('/stats/summary', {
      params: { ton_address: authStore.user?.ton_address, period },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Fetches transaction history for the authenticated user.
 * @param {string} [period='1w'] - The time period for the transactions.
 * @returns {Promise<Object>} The transaction history data.
 */
async function getTransactions(period = '1w') {
  try {
    const authStore = useAuthStore();
    const response = await api.get('/stats/transactions', {
      params: { ton_address: authStore.user?.ton_address, period },
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Prepares a withdrawal transaction by getting the payload from the backend.
 * @param {Object} data - The withdrawal data.
 * @param {number} data.amount - The withdrawal amount.
 * @returns {Promise<Object>} The prepared transaction data (BOC, contract address).
 */
async function prepareWithdrawal(data) {
  try {
    const response = await api.post('/transactions/withdraw-prepare', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Processes a deposit transaction after it has been sent to the smart contract.
 * @param {Object} data - The deposit data.
 * @param {string} data.tonAddress - The TON address of the user.
 * @param {number} data.amount - The deposit amount.
 * @param {string} data.txHash - The transaction hash (BOC).
 * @returns {Promise<Object>} The deposit response data.
 */
async function deposit(data) {
  try {
    const response = await api.post('/transactions/deposit', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Initiates a token withdrawal transaction.
 * @param {Object} params - The token withdrawal parameters.
 * @param {string} params.tonAddress - The TON address of the user.
 * @param {number} params.amount - The token amount to withdraw.
 * @returns {Promise<Object>} The token withdrawal response data.
 */
async function withdrawTokens({ tonAddress, amount }) {
  try {
    const response = await api.post('/tokens/withdraw', {
      tonAddress,
      amount,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Executes a buy trade.
 * @param {Object} params - The buy trade parameters.
 * @param {string} params.ton_address - The TON address of the user.
 * @param {number} params.amount - The trade amount.
 * @param {string} params.symbol - The trading pair symbol.
 * @returns {Promise<Object>} The buy trade response data.
 */
async function buyTrade({ ton_address, amount, symbol }) {
  try {
    const response = await api.post('/trades/buy', {
      ton_address,
      amount,
      symbol,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Executes a sell trade.
 * @param {Object} params - The sell trade parameters.
 * @param {string} params.ton_address - The TON address of the user.
 * @param {number} params.amount - The trade amount.
 * @param {string} params.symbol - The trading pair symbol.
 * @returns {Promise<Object>} The sell trade response data.
 */
async function sellTrade({ ton_address, amount, symbol }) {
  try {
    const response = await api.post('/trades/sell', {
      ton_address,
      amount,
      symbol,
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export default {
  generateChallenge,
  verifyProof,
  login,
  verifyToken,
  getUserBalance,
  getCandles,
  getCurrentPrice,
  getTonPrice,
  getTradeHistory,
  getSummary,
  getTransactions,
  prepareWithdrawal,
  deposit,
  withdrawTokens,
  buyTrade,
  sellTrade,
};
