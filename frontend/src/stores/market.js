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
    timeframe: localStorage.getItem('marketTimeFrame') || '5m',
  }),
  actions: {
    /**
     * Sets whether the current page is the main trading page.
     * @param {boolean} isMain - True if on the main page, false otherwise.
     */
    setMainPage(isMain) {
      this.isMainPage = isMain;
    },
    /**
     * Sets the timeframe for market data and updates WebSocket subscriptions.
     * @param {string} timeframe - The timeframe (e.g., '1m', '5m', '15m').
     */
    setTimeframe(timeframe) {
      if (!['1m', '5m', '15m'].includes(timeframe)) {
        console.error(`[marketStore] Invalid timeframe: ${timeframe}`);
        useErrorStore().setError('Invalid timeframe selected');
        return;
      }
      const oldTimeframe = this.timeframe;
      this.timeframe = timeframe;
      localStorage.setItem('marketSTimeFrame', timeframe);

      if (this.ws && oldTimeframe !== timeframe) {
        this.ws.unsubscribe(`candles:TON-USDT:${oldTimeframe}`);
        this.ws.subscribe(`candles:TON-USDT:${timeframe}`);
      }
    },
    /**
     * Fetches candlestick data for a trading pair.
     * @param {string} [symbol='TON-USDT'] - The trading pair ID.
     * @param {string} [timeframe=this.timeframe] - The candlestick interval.
     */
    async fetchCandles(symbol = 'TON-USDT', timeframe = this.timeframe) {
      try {
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
      } catch (error) {
        console.error('[marketStore] Error fetching candles:', error);
        useErrorStore().setError('Failed to fetch candles');
        this.candles = [];
      }
    },
    /**
     * Fetches the current price for a trading pair.
     * @param {string} [symbol='TON-USDT'] - The trading pair ID.
     */
    async fetchCurrentPrice(symbol = 'TON-USDT') {
      if (!this.isMainPage) {
        return;
      }
      try {
        const response = await apiService.getCurrentPrice(symbol);

        let price = response.price;
        if (typeof price !== 'number') {
          console.error('[marketStore] Unexpected price format:', response);
          this.currentPrice = null;
          return;
        }

        this.currentPrice = price;
      } catch (error) {
        console.error('[marketStore] Error fetching current price:', error);
        useErrorStore().setError('Failed to fetch current price');
        this.currentPrice = null;
      }
    },
    /**
     * Starts real-time WebSocket updates for market data.
     * @param {string} [symbol='TON-USDT'] - The trading pair ID.
     */
    startRealTimeUpdates(symbol = 'TON-USDT') {
      if (!this.isMainPage) {
        return;
      }
      if (this.ws) return;
      this.ws = new WebSocketService();
      this.ws.connect((data) => {
        if (data.type === 'ticker' && data.symbol === symbol) {
          this.currentPrice = data.price;
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
          } catch (error) {
            console.error('[marketStore] Error processing WebSocket candle:', error, data);
          }
        }
      });
      this.ws.subscribe(`ticker:${symbol}`);
      this.ws.subscribe(`candles:${symbol}:${this.timeframe}`);
    },
    /**
     * Stops real-time WebSocket updates and closes the connection.
     */
    stopRealTimeUpdates() {
      if (this.ws) {
        this.ws.unsubscribe(`ticker:TON-USDT`);
        this.ws.unsubscribe(`candles:TON-USDT:${this.timeframe}`);
        this.ws.close();
        this.ws = null;
      }
    },
  },
});
