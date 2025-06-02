<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <TradingChart />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <TradeButtons />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <ActiveTrades />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useTradingStore } from '@/stores/trading'
import { useAuthStore } from '@/stores/auth'
import { useErrorStore } from '@/stores/error'
import TradingChart from '@/components/trading/TradingChart.vue'
import TradeButtons from '@/components/trading/TradeButtons.vue'
import ActiveTrades from '@/components/trading/ActiveTrades.vue'

const marketStore = useMarketStore()
const tradingStore = useTradingStore()
const authStore = useAuthStore()
const errorStore = useErrorStore()

onMounted(async () => {
  if (!authStore.isConnected) {
    try {
      await authStore.verifyToken()
    } catch {
      errorStore.setError('Please connect wallet')
      return
    }
  }
  try {
    await Promise.all([
      marketStore.fetchCandles(),
      marketStore.fetchCurrentPrice(),
      tradingStore.fetchTradeHistory(),
      tradingStore.fetchActiveTrades(),
    ])
    marketStore.startRealTimeUpdates()
  } catch (error) {
    errorStore.setError('Failed to load market data')
  }
})
</script>
