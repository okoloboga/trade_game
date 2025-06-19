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
        this.depositAddress = authStore.walletAddress;
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
    async fetchBalance() {
      console.log('[walletStore] Starting fetchBalance');
      try {
        const authStore = useAuthStore();
        console.log('[walletStore] authStore.user:', authStore.user, 'authStore.walletAddress:', authStore.walletAddress);
        if (!authStore.walletAddress) {
          console.error('[walletStore] No ton_address for fetching balance');
          return;
        }
        const response = await apiService.getUserBalance(authStore.walletAddress);
        this.balance = Number(response.balance);
        this.tokenBalance = Number(response.token_balance);
        console.log('[walletStore] Fetched balance:', this.balance);
      } catch (error) {
        console.error('[walletStore] Failed to fetch balance:', error);
        useErrorStore().setError('Failed to fetch balance');
      }
    },
    async deposit({ amount, txHash }) {
      this.isProcessing = true;
      try {
        const authStore = useAuthStore();
        console.log('[walletStore] Depositing with ton_address:', authStore.walletAddress);
        const response = await apiService.deposit({
          tonAddress: authStore.walletAddress,
          amount,
          txHash,
        });
        if (!response?.user?.balance) {
          console.error('[walletStore] Invalid response:', response);
          throw new Error('Invalid response: user data missing');
        }
        this.balance = Number(response.user.balance);
        console.log('[walletStore] Deposit response:', response);
        return response;
      } catch (error) {
        console.error('[walletStore] Deposit failed:', error);
        useErrorStore().setError('Deposit failed');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
    async withdraw(amount) {
      this.isProcessing = true;
      try {
        const authStore = useAuthStore();
        const fee = 0.1;
        console.log('[walletStore] Withdrawing with ton_address:', authStore.walletAddress, 'amount:', amount, 'fee:', fee);
        if (amount < 0.11) {
          throw new Error('Amount must be at least 0.11 TON (including 0.1 TON fee)');
        }
        const response = await apiService.withdraw({
          tonAddress: authStore.walletAddress,
          amount,
        });
        if (!response?.user?.balance) {
          console.error('[walletStore] Invalid response:', response);
          throw new Error('Invalid response: user data missing');
        }
        this.balance = Number(response.user.balance);
        console.log('[walletStore] Withdraw response:', response, 'transferred:', amount - fee);
        return response;
      } catch (error) {
        console.error('[walletStore] Withdraw failed:', error);
        useErrorStore().setError('Withdrawal failed');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
    async withdrawTokens({ tonAddress, amount }) {
      this.isProcessing = true;
      try {
        const response = await apiService.withdrawTokens({
          tonAddress: tonAddress,
          amount: amount,
        });
        this.tokenBalance = response.user.token_balance;
        console.log('[walletStore] Token withdraw response:', response);
        return response;
      } catch (error) {
        console.error('[walletStore] Token withdrawal failed:', error);
        useErrorStore().setError('RUBLE withdrawal failed');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
  },
});
