import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { validateTradeType, validateAmount } from '@/utils/validators';

export const useTradingStore = defineStore('trading', {
  state: () => ({
    tradeHistory: [],
    isPlacingTrade: false,
  }),
  actions: {
    async fetchTradeHistory(period = '1w') {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      try {
        console.log('[tradingStore] Fetching trade history for:', authStore.user.ton_address, 'period:', period);
        const response = await apiService.getTradeHistory(period);
        this.tradeHistory = response.trades;
        console.log('[tradingStore] Trade history fetched:', this.tradeHistory.length);
      } catch (error) {
        console.error('[tradingStore] Failed to fetch trade history:', error);
        useErrorStore().setError('Failed to fetch trade history');
        throw error;
      }
    },
    async executeTrade(type, amount, symbol) {
      const authStore = useAuthStore();
      const walletStore = useWalletStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      const typeValidation = validateTradeType(type);
      if (typeValidation !== true) {
        useErrorStore().setError(typeValidation);
        throw new Error(typeValidation);
      }
      const amountValidation = validateAmount(amount, 10, 0.01);
      if (amountValidation !== true) {
        useErrorStore().setError(amountValidation);
        throw new Error(amountValidation);
      }
      if (!symbol) {
        useErrorStore().setError('Symbol is required');
        throw new Error('Symbol is required');
      }
      this.isPlacingTrade = true;
      try {
        const response = await (type === 'buy'
          ? apiService.buyTrade({
              ton_address: authStore.user.ton_address,
              amount,
              symbol,
            })
          : apiService.sellTrade({
              ton_address: authStore.user.ton_address,
              amount,
              symbol,
            }));
        this.tradeHistory.push(response.trade);
        authStore.updateUser(response.user); // Обновляем authStore
        walletStore.updateBalances(response.user); // Обновляем walletStore
        useErrorStore().setError('Trade executed successfully', false);
      } catch (error) {
        console.error('[tradingStore] Failed to execute trade:', error);
        useErrorStore().setError('Failed to execute trade');
        throw error;
      } finally {
        this.isPlacingTrade = false;
      }
    },
  },
});
