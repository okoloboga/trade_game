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
    console.log('[walletStore] Initial state:', initialState);
    return initialState;
  },
  actions: {
    syncFromAuthStore() {
      const authStore = useAuthStore();
      if (authStore.user) {
        this.balance = parseFloat(authStore.user.balance) || 0.0;
        this.usdt_balance = parseFloat(authStore.user.usdt_balance) || 0.0;
        this.tokenBalance = parseFloat(authStore.user.token_balance) || 0.0;
        this.depositAddress = authStore.walletAddress;
        console.log('[walletStore] Synced from authStore:', {
          balance: this.balance,
          usdt_balance: this.usdt_balance,
          tokenBalance: this.tokenBalance,
          depositAddress: this.depositAddress,
        });
      }
    },
    updateBalances(userData) {
      this.balance = parseFloat(userData.balance) || 0.0;
      this.usdt_balance = parseFloat(userData.usdt_balance) || 0.0;
      this.tokenBalance = parseFloat(userData.token_balance) || 0.0;
      console.log('[walletStore] Balances updated:', {
        balance: this.balance,
        usdt_balance: this.usdt_balance,
        tokenBalance: this.tokenBalance,
      });
    },
    async fetchBalances() {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      this.isFetchingBalances = true;
      try {
        console.log('[walletStore] Fetching balances for:', authStore.user.ton_address);
        const response = await apiService.getUserBalance(authStore.user.ton_address);
        this.updateBalances(response);
        console.log('[walletStore] Balances fetched:', response);
      } catch (error) {
        console.error('[walletStore] Failed to fetch balances:', error);
        useErrorStore().setError('Failed to fetch balances');
        throw error;
      } finally {
        this.isFetchingBalances = false;
      }
    },
    async fetchTonPrice() {
      try {
        const response = await apiService.getTonPrice();
        this.tonPrice = response.price;
        console.log('[walletStore] TON price fetched:', this.tonPrice);
      } catch (error) {
        console.error('[walletStore] Failed to fetch TON price:', error);
        useErrorStore().setError('Failed to fetch TON price');
        throw error;
      }
    },
    async fetchTransactions(period = '1w') {
      try {
        const authStore = useAuthStore();
        if (!authStore.isConnected || !authStore.user?.ton_address) {
          useErrorStore().setError('Please connect wallet');
          throw new Error('Not connected');
        }
        console.log('[walletStore] Fetching transactions for:', authStore.user.ton_address, 'period:', period);
        const response = await apiService.getTransactions(period);
        this.transactions = response.transactions;
        console.log('[walletStore] Transactions fetched:', this.transactions.length);
      } catch (error) {
        console.error('[walletStore] Failed to fetch transactions:', error);
        useErrorStore().setError('Failed to fetch transactions');
        throw error;
      }
    },
  },
});
