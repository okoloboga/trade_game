import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';

export const useWalletStore = defineStore('wallet', {
  state: () => {
    const initialState = {
      balance: 0.0,
      tokenBalance: 0.0,
      depositAddress: null,
      tonPrice: 0.0,
      transactions: [],
      isProcessing: false,
    };
    console.log('[walletStore] Initial state:', initialState);
    return initialState;
  },
  actions: {
    syncFromAuthStore() {
      const authStore = useAuthStore();
      if (authStore.user) {
        this.balance = parseFloat(authStore.user.balance) || 0.0;
        this.tokenBalance = parseFloat(authStore.user.token_balance) || 0.0;
        this.depositAddress = authStore.user.ton_address;
        console.log('[walletStore] Synced from authStore:', {
          balance: this.balance,
          tokenBalance: this.tokenBalance,
          depositAddress: this.depositAddress,
        });
      }
    },
    async fetchTonPrice() {
      try {
        const response = await apiService.getTonPrice();
        this.tonPrice = response.price;
      } catch (error) {
        useErrorStore().setError('Failed to fetch TON price');
        throw error;
      }
    },
    async fetchTransactions() {
      try {
        const response = await apiService.getTransactions();
        this.transactions = response.transactions;
      } catch (error) {
        useErrorStore().setError('Failed to fetch transactions');
        throw error;
      }
    },
    async fetchBalance() {
      try {
        const authStore = useAuthStore();
        if (!authStore.user?.id) {
          console.error('[walletStore] No user ID for fetching balance');
          return;
        }
        const response = await apiService.getUserBalance(authStore.user.id);
        this.balance = Number(response.balance);
        this.tokenBalance = Number(response.token_balance);
        console.log('[walletStore] Fetched balance:', this.balance);
      } catch (error) {
        console.error('[walletStore] Failed to fetch balance:', error);
        useErrorStore().setError('Failed to fetch balance');
      }
    },
    async deposit({ amount, txHash, account, clientId }) {
      this.isProcessing = true;
      try {
        const authStore = useAuthStore();
        const response = await apiService.deposit({
          userId: authStore.user?.id,
          amount,
          txHash,
          account,
          clientId,
        });
        if (!response.user) {
          throw new Error('Invalid response: user data missing');
        }
        this.balance = Number(response.user.balance);
        return response;
      } catch (error) {
        useErrorStore().setError('Deposit failed');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
    async withdraw(amount) {
      this.isProcessing = true;
      try {
        const response = await apiService.withdraw(amount);
        this.balance = response.user.balance;
        return response;
      } catch (error) {
        useErrorStore().setError('Withdrawal failed');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
    async withdrawTokens(amount) {
      this.isProcessing = true;
      try {
        const response = await apiService.withdrawTokens(amount);
        this.tokenBalance = response.user.token_balance;
        return response;
      } catch (error) {
        useErrorStore().setError('RUBLE withdrawal failed');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
  },
});
