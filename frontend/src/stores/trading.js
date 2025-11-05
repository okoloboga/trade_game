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
    /**
     * Fetches the trade history for the authenticated user.
     * @param {string} [period='1w'] - The time period for the trade history.
     */
    async fetchTradeHistory(period = '1w') {
      const authStore = useAuthStore();
      if (!authStore.isConnected || !authStore.user?.ton_address) {
        useErrorStore().setError('Please connect wallet');
        throw new Error('Not connected');
      }
      try {
        const response = await apiService.getTradeHistory(period);
        this.tradeHistory = response.trades || [];
      } catch (error) {
        console.error('[tradingStore] Failed to fetch trade history:', error);
        useErrorStore().setError('Failed to fetch trade history');
        throw error;
      }
    },
    /**
     * Executes a buy or sell trade.
     * @param {string} type - The trade type ('buy' or 'sell').
     * @param {number} amount - The trade amount in USD.
     * @param {string} symbol - The trading pair symbol.
     */
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
        // Ensure tradeHistory is initialized as array
        if (!this.tradeHistory) {
          this.tradeHistory = [];
        }
        if (response.trade) {
          this.tradeHistory.push(response.trade);
        }
        walletStore.updateBalances(response.user);
        await walletStore.fetchBalances();
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
