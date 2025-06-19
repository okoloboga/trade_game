import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';
import { validateTradeType, validateAmount } from '@/utils/validators';

export const useTradingStore = defineStore('trading', {
  state: () => ({
    activeTrades: [],
    tradeHistory: [],
    isPlacingTrade: false,
    isProcessing: false,
  }),
  actions: {
    async fetchActiveTrades() {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      try {
        console.log('[tradingStore] Fetching active trades for:', authStore.user.ton_address);
        const response = await apiService.getTradeHistory('1w');
        this.activeTrades = response.trades.filter(t => t.status === 'open');
        console.log('[tradingStore] Active trades fetched:', this.activeTrades.length);
      } catch (error) {
        console.error('[tradingStore] Failed to fetch active trades:', error);
        useErrorStore().setError('Failed to fetch active trades');
        throw error;
      }
    },
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
    async placeTrade({ type, amount, symbol }) {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      const typeValidation = validateTradeType(type);
      if (typeValidation !== true) {
        useErrorStore().setError(typeValidation);
        throw new Error(typeValidation);
      }
      const amountValidation = validateAmount(amount, Number.MAX_SAFE_INTEGER, 0.01);
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
        const response = await apiService.placeTrade({ type, amount, symbol });
        this.activeTrades.push(response.trade);
        useErrorStore().setError('Trade placed successfully', false);
      } catch (error) {
        console.error('[tradingStore] Failed to place trade:', error);
        useErrorStore().setError('Failed to place trade');
        throw error;
      } finally {
        this.isPlacingTrade = false;
      }
    },
    async cancelTrade(tradeId) {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      if (!tradeId) {
        useErrorStore().setError('Trade ID is required');
        throw new Error('Trade ID is required');
      }
      this.isProcessing = true;
      try {
        const response = await apiService.cancelTrade(tradeId);
        this.activeTrades = this.activeTrades.filter(t => t.id !== tradeId);
        useErrorStore().setError('Trade cancelled successfully', false);
      } catch (error) {
        console.error('[tradingStore] Failed to cancel trade:', error);
        useErrorStore().setError('Failed to cancel trade');
        throw error;
      } finally {
        this.isProcessing = false;
      }
    },
  },
});
