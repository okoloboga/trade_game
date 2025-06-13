import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    balance: 0,
    tokenBalance: 0,
    depositAddress: null,
    tonPrice: 0,
    transactions: [],
    isProcessing: false,
  }),
  actions: {
    syncFromAuthStore() {
      const authStore = useAuthStore();
      if (authStore.user) {
        this.balance = authStore.user.balance;
        this.tokenBalance = authStore.user.token_balance;
        this.depositAddress = authStore.user.ton_address;
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
    async deposit(amount) {
      this.isProcessing = true;
      try {
        const response = await apiService.deposit(amount, 'pending');
        this.balance = response.user.balance;
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
