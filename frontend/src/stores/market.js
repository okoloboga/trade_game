import { defineStore } from 'pinia'
import apiService from '@/services/api'
import { WebSocketService } from '@/services/websocket'
import { useErrorStore } from '@/stores/error'

export const useMarketStore = defineStore('market', {
  state: () => ({
    candles: [],
    currentPrice: null,
    ws: null,
  }),
  actions: {
    async fetchCandles(symbol = 'BTC-USDT', timeframe = '5m') {
      try {
        const response = await apiService.getCandles(symbol, timeframe)
        this.candles = response.candles
      } catch (error) {
        useErrorStore().setError('Failed to fetch candles')
        throw error
      }
    },
    async fetchCurrentPrice(symbol = 'BTC-USDT') {
      try {
        const response = await apiService.getCurrentPrice(symbol)
        this.currentPrice = response.price
      } catch (error) {
        useErrorStore().setError('Failed to fetch current price')
        throw error
      }
    },
    startRealTimeUpdates(symbol = 'BTC-USDT') {
      if (this.ws) return
      this.ws = new WebSocketService()
      this.ws.connect((data) => {
        if (data.type === 'ticker' && data.symbol === symbol) {
          this.currentPrice = data.price
        }
        if (data.type === 'candle' && data.symbol === symbol) {
          this.candles = [...this.candles.slice(-99), data.candle]
        }
      })
      this.ws.subscribe(`ticker:${symbol}`)
      this.ws.subscribe(`candles:${symbol}:5m`)
    },
    stopRealTimeUpdates() {
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
    },
  },
})
