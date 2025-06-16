import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { WebSocketService } from '@/services/websocket';
import { useErrorStore } from '@/stores/error';
import { useRouter } from 'vue-router';

export const useMarketStore = defineStore('market', {
  state: () => ({
    candles: [],
    currentPrice: null,
    ws: null,
  }),
  actions: {
    async fetchCandles(symbol = 'TON-USDT', timeframe = '5m') {
      try {
        console.log('Fetching candles for:', symbol, timeframe);
        const response = await apiService.getCandles(symbol, timeframe);

        if (!Array.isArray(response)) {
          console.error('Candles response is not an array:', response);
          this.candles = [];
          return;
        }

        const validCandles = response.filter(candle => {
          if (!candle || !candle.timestamp || !candle.open || !candle.high || !candle.low || !candle.close) {
            console.warn('Invalid candle data (missing fields):', candle);
            return false;
          }
          if (isNaN(Number(candle.open)) || isNaN(Number(candle.high)) ||
              isNaN(Number(candle.low)) || isNaN(Number(candle.close))) {
            console.warn('Invalid candle data (non-numeric values):', candle);
            return false;
          }
          return true;
        });

        this.candles = validCandles.sort((a, b) => a.timestamp - b.timestamp);
        console.log('Candles after fetch:', this.candles.length);
      } catch (error) {
        console.error('Error fetching candles:', error);
        useErrorStore().setError('Failed to fetch candles');
        this.candles = [];
      }
    },
    async fetchCurrentPrice(symbol = 'TON-USDT') {
      const router = useRouter();
      if (router.currentRoute.value.path !== '/') {
        console.log(`Skipping fetchCurrentPrice: not on main page (current path: ${router.currentRoute.value.path})`);
        return;
      }
      try {
        console.log('Fetching current price for:', symbol);
        const response = await apiService.getCurrentPrice(symbol);
        console.log('Raw price response:', JSON.stringify(response, null, 2));

        let price = response.price;
        if (typeof price !== 'number') {
          console.error('Unexpected price format:', response);
          this.currentPrice = null;
          return;
        }

        this.currentPrice = price;
        console.log('Current price after fetch:', this.currentPrice);
      } catch (error) {
        console.error('Error fetching current price:', error);
        useErrorStore().setError('Failed to fetch current price');
        this.currentPrice = null;
      }
    },
    startRealTimeUpdates(symbol = 'TON-USDT') {
      const router = useRouter();
      if (router.currentRoute.value.path !== '/') {
        console.log(`Skipping startRealTimeUpdates: not on main page (current path: ${router.currentRoute.value.path})`);
        return;
      }
      if (this.ws) return;
      console.log('Starting WebSocket updates for:', symbol);
      this.ws = new WebSocketService();
      this.ws.connect((data) => {
        console.log('WebSocket data received:', JSON.stringify(data, null, 2));
        if (data.type === 'ticker' && data.symbol === symbol) {
          this.currentPrice = data.price;
          console.log('Updated current price from WebSocket:', this.currentPrice);
        }
        if (data.type === 'candle' && data.symbol === symbol) {
          if (!this.candles) this.candles = [];
          try {
            const candle = data.candle;
            if (!candle.timestamp || !candle.open || !candle.high || !candle.low || !candle.close) {
              console.warn('Invalid WebSocket candle:', candle);
              return;
            }
            const existingIndex = this.candles.findIndex(c => c.timestamp === candle.timestamp);
            if (existingIndex >= 0) {
              this.candles[existingIndex] = candle;
            } else {
              this.candles = [...this.candles.slice(-99), candle];
            }
            console.log('Updated candles array:', this.candles.length);
          } catch (error) {
            console.error('Error processing WebSocket candle:', error, data);
          }
        }
      });
      this.ws.subscribe(`ticker:${symbol}`);
      this.ws.subscribe(`candles:${symbol}:5m`);
      console.log('WebSocket subscriptions active');
    },
    stopRealTimeUpdates() {
      if (this.ws) {
        console.log('Stopping WebSocket updates');
        this.ws.close();
        this.ws = null;
      }
    },
  },
});
