import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { WebSocketService } from '@/services/websocket';
import { useErrorStore } from '@/stores/error';

export const useMarketStore = defineStore('market', {
  state: () => ({
    candles: [],
    currentPrice: null,
    ws: null,
    isMainPage: true,
    timeframe: localStorage.getItem('marketTimeFrame') || '5m', // Добавляем состояние для таймфрейма
  }),
  actions: {
    setMainPage(isMain) {
      this.isMainPage = isMain;
    },
    setTimeframe(timeframe) {
      console.log(`[marketStore] Setting timeframe to: ${timeframe}`);
      if (!['1m', '5m', '15m'].includes(timeframe)) {
        console.error(`[marketStore] Invalid timeframe: ${timeframe}`);
        useErrorStore().setError('Invalid timeframe selected');
        return;
      }
      const oldTimeframe = this.timeframe;
      this.timeframe = timeframe;
      localStorage.setItem('marketSTimeFrame', timeframe);

      // Отписываемся от старого канала свечей и подписываемся на новый
      if (this.ws && oldTimeframe !== timeframe) {
        console.log(`[marketStore] Unsubscribing from candles:TON-USDT:${oldTimeframe}`);
        this.ws.unsubscribe(`candles:TON-USDT:${oldTimeframe}`);
        console.log(`[marketStore] Subscribing to candles:TON-USDT:${timeframe}`);
        this.ws.subscribe(`candles:TON-USDT:${timeframe}`);
      }
    },
    async fetchCandles(symbol = 'TON-USDT', timeframe = this.timeframe) {
      try {
        console.log(`[marketStore] Fetching candles for: ${symbol}, timeframe: ${timeframe}`);
        const response = await apiService.getCandles(symbol, timeframe);

        if (!Array.isArray(response)) {
          console.error('[marketStore] Candles response is not an array:', response);
          useErrorStore().setError('Invalid candles data');
          this.candles = [];
          return;
        }

        const validCandles = response.filter(candle => {
          if (!candle || !candle.timestamp || !candle.open || !candle.high || !candle.low || !candle.close) {
            console.warn('[marketStore] Invalid candle data (missing fields):', candle);
            return false;
          }
          if (isNaN(Number(candle.open)) || isNaN(Number(candle.high)) ||
              isNaN(Number(candle.low)) || isNaN(Number(candle.close))) {
            console.warn('[marketStore] Invalid candle data (non-numeric values):', candle);
            return false;
          }
          return true;
        });

        this.candles = validCandles.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`[marketStore] Candles fetched: ${this.candles.length}`);
      } catch (error) {
        console.error('[marketStore] Error fetching candles:', error);
        useErrorStore().setError('Failed to fetch candles');
        this.candles = [];
      }
    },
    async fetchCurrentPrice(symbol = 'TON-USDT') {
      if (!this.isMainPage) {
        console.log(`[marketStore] Skipping fetchCurrentPrice: not on main page`);
        return;
      }
      try {
        console.log(`[marketStore] Fetching current price for: ${symbol}`);
        const response = await apiService.getCurrentPrice(symbol);
        console.log('[marketStore] Raw price response:', JSON.stringify(response, null, 2));

        let price = response.price;
        if (typeof price !== 'number') {
          console.error('[marketStore] Unexpected price format:', response);
          this.currentPrice = null;
          return;
        }

        this.currentPrice = price;
        console.log(`[marketStore] Current price fetched: ${this.currentPrice}`);
      } catch (error) {
        console.error('[marketStore] Error fetching current price:', error);
        useErrorStore().setError('Failed to fetch current price');
        this.currentPrice = null;
      }
    },
    startRealTimeUpdates(symbol = 'TON-USDT') {
      if (!this.isMainPage) {
        console.log(`[marketStore] Skipping startRealTimeUpdates: not on main page`);
        return;
      }
      if (this.ws) return;
      console.log(`[marketStore] Starting WebSocket updates for: ${symbol}`);
      this.ws = new WebSocketService();
      this.ws.connect((data) => {
        console.log('[marketStore] WebSocket data received:', JSON.stringify(data, null, 2));
        if (data.type === 'ticker' && data.symbol === symbol) {
          this.currentPrice = data.price;
          console.log(`[marketStore] Updated current price from WebSocket: ${this.currentPrice}`);
        }
        if (data.type === 'candle' && data.symbol === symbol) {
          if (!this.candles) this.candles = [];
          try {
            const candle = data.candle;
            if (!candle.timestamp || !candle.open || !candle.high || !candle.low || !candle.close) {
              console.warn('[marketStore] Invalid WebSocket candle:', candle);
              return;
            }
            const existingIndex = this.candles.findIndex(c => c.timestamp === candle.timestamp);
            if (existingIndex >= 0) {
              this.candles[existingIndex] = candle;
            } else {
              this.candles = [...this.candles.slice(-99), candle];
            }
            console.log(`[marketStore] Updated candles array: ${this.candles.length}`);
          } catch (error) {
            console.error('[marketStore] Error processing WebSocket candle:', error, data);
          }
        }
      });
      this.ws.subscribe(`ticker:${symbol}`);
      this.ws.subscribe(`candles:${symbol}:${this.timeframe}`);
      console.log('[marketStore] WebSocket subscriptions active');
    },
    stopRealTimeUpdates() {
      if (this.ws) {
        console.log('[marketStore] Stopping WebSocket updates');
        this.ws.unsubscribe(`ticker:TON-USDT`);
        this.ws.unsubscribe(`candles:TON-USDT:${this.timeframe}`);
        this.ws.close();
        this.ws = null;
      }
    },
  },
});
