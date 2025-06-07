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

    // Проверяем и обрабатываем данные
    if (Array.isArray(response)) {
      // Проверяем каждую свечу на валидность
      const validCandles = response.filter(candle => {
        if (!candle || candle.timestamp === undefined ||
            candle.open === undefined || candle.high === undefined ||
            candle.low === undefined || candle.close === undefined) {
          console.warn('Invalid candle data (missing fields):', candle)
          return false
        }

        // Проверяем, что все значения - числа
        if (isNaN(Number(candle.open)) || isNaN(Number(candle.high)) ||
            isNaN(Number(candle.low)) || isNaN(Number(candle.close))) {
          console.warn('Invalid candle data (non-numeric values):', candle)
          return false
        }

        return true
      })

      console.log(`Filtered ${response.length - validCandles.length} invalid candles`)
      console.log('First 3 valid candles:', validCandles.slice(0, 3))
      console.log('Last 3 valid candles:', validCandles.slice(-3))

      // Сортируем свечи по времени
      this.candles = validCandles.sort((a, b) => a.timestamp - b.timestamp)
    } else {
      console.error('Unexpected response format:', response)
      this.candles = []
    }

    console.log('Candles after fetch:', this.candles.length)
  } catch (error) {
    console.error('Error fetching candles:', error)
    useErrorStore().setError('Failed to fetch candles')
    this.candles = []
  }
},

    async fetchCurrentPrice(symbol = 'BTC-USDT') {
      try {
        const response = await apiService.getCurrentPrice(symbol)
        console.log('Fetched price response:', response)

        // Проверяем формат ответа и соответственно обрабатываем
        if (typeof response === 'number') {
          this.currentPrice = response
        } else if (response && response.price) {
          this.currentPrice = response.price
        } else {
          console.error('Unexpected price response format:', response)
          this.currentPrice = null
        }

        console.log('Current price after fetch:', this.currentPrice)
      } catch (error) {
        console.error('Error fetching current price:', error)
        useErrorStore().setError('Failed to fetch current price')
        throw error
      }
    },

    startRealTimeUpdates(symbol = 'BTC-USDT') {
      if (this.ws) return
      this.ws = new WebSocketService()
      this.ws.connect((data) => {
        console.log('WebSocket data received in store:', JSON.stringify(data));

        if (data.type === 'ticker' && data.symbol === symbol) {
          this.currentPrice = data.price
          console.log('Updated current price from WebSocket:', this.currentPrice)
        }

        if (data.type === 'candle' && data.symbol === symbol) {
          // Убедитесь, что candles инициализирован
          if (!this.candles) this.candles = [];

          try {
            // Добавьте новую свечу или обновите последнюю, если timestamp совпадает
            const existingIndex = this.candles.findIndex(c => c.timestamp === data.candle.timestamp);
            if (existingIndex >= 0) {
              this.candles[existingIndex] = data.candle;
            } else {
              this.candles = [...this.candles.slice(-99), data.candle];
            }

            console.log('Updated candles array:', this.candles.length);
          } catch (error) {
            console.error('Error processing candle data:', error, data)
          }
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
