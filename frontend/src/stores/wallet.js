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
    async deposit({ amount, txHash, tonProof, account, clientId }) {
      this.isProcessing = true;
      try {
        const authStore = useAuthStore();
        const response = await apiService.deposit({
          userId: authStore.user?.id,
          amount,
          txHash,
          tonProof,
          account,
          clientId,
        });
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
