import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';

export const useWalletStore = defineStore('wallet', {
  state: () => {
    const initialState = {
      balance: 0.0,
      usdt_balance: 0.0,
      tokenBalance: 0.0,
      depositAddress: null,
      tonPrice: 0.0,
      transactions: [],
      isProcessing: false,
      isFetchingBalances: false,
    };
    return initialState;
  },
  actions: {
    /**
     * Syncs wallet balances and address from the auth store.
     */
    syncFromAuthStore() {
      const authStore = useAuthStore();
      if (authStore.user) {
        this.balance = parseFloat(authStore.user.balance) || 0.0;
        this.usdt_balance = parseFloat(authStore.user.usdt_balance) || 0.0;
        this.tokenBalance = parseFloat(authStore.user.token_balance) || 0.0;
        this.depositAddress = authStore.walletAddress;
      }
    },
    /**
     * Updates wallet balances with new user data.
     * @param {Object} userData - The user data containing balance information.
     */
    updateBalances(userData) {
      this.balance = parseFloat(userData.balance) || 0.0;
      this.usdt_balance = parseFloat(userData.usdt_balance) || 0.0;
      this.tokenBalance = parseFloat(userData.token_balance) || 0.0;
    },
    /**
     * Fetches the user's wallet balances.
     */
    async fetchBalances() {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      this.isFetchingBalances = true;
      try {
        const response = await apiService.getUserBalance(authStore.user.ton_address);
        this.updateBalances(response);
      } catch (error) {
        console.error('[walletStore] Failed to fetch balances:', error);
        useErrorStore().setError('Failed to fetch balances');
        throw error;
      } finally {
        this.isFetchingBalances = false;
      }
    },
    /**
     * Fetches the current TON price.
     */
    async fetchTonPrice() {
      try {
        const response = await apiService.getTonPrice();
        this.tonPrice = response.price;
      } catch (error) {
        console.error('[walletStore] Failed to fetch TON price:', error);
        useErrorStore().setError('Failed to fetch TON price');
        throw error;
      }
    },
    /**
     * Fetches the transaction history for the authenticated user.
     * @param {string} [period='1w'] - The time period for the transactions.
     */
    async fetchTransactions(period = '1w') {
      try {
        const authStore = useAuthStore();
        if (!authStore.isConnected || !authStore.user?.ton_address) {
          useErrorStore().setError('Please connect wallet');
          throw new Error('Not connected');
        }
        const response = await apiService.getTransactions(period);
        this.transactions = response.transactions;
      } catch (error) {
        console.error('[walletStore] Failed to fetch transactions:', error);
        useErrorStore().setError('Failed to fetch transactions');
        throw error;
      }
    },
    async withdrawTokens(amount) {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      this.isProcessing = true;
      try {
        const response = await apiService.withdrawTokens({
          tonAddress: authStore.user.ton_address,
          amount,
        });
        this.updateBalances(response.user);
        return response;
      } catch (error) {
        console.error('[walletStore] Failed to withdraw tokens:', error);
        useErrorStore().setError('Failed to withdraw tokens');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
  },
});
