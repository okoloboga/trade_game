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

    <!-- Показываем ошибки если есть -->
    <v-row v-if="errorStore.error">
      <v-col cols="12">
        <v-alert type="warning" dismissible @click:close="errorStore.clearError()">
          {{ errorStore.error }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
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
  console.log('MainView mounted, initializing...')
  try {
    await marketStore.fetchCandles();
    await marketStore.fetchCurrentPrice();
    marketStore.startRealTimeUpdates();
  } catch (error) {
    console.error('Error initializing data:', error);
  }

  // Очищаем предыдущие ошибки
  errorStore.clearError()

  // Пробуем загрузить данные, но не падаем на ошибках
  const loadData = async () => {
    const results = await Promise.allSettled([
      marketStore.fetchCandles().catch(e => console.log('Candles fetch failed:', e.message)),
      marketStore.fetchCurrentPrice().catch(e => console.log('Price fetch failed:', e.message)),
      tradingStore.fetchTradeHistory().catch(e => console.log('Trade history fetch failed:', e.message)),
      tradingStore.fetchActiveTrades().catch(e => console.log('Active trades fetch failed:', e.message)),
    ])

    const failures = results.filter(r => r.status === 'rejected').length
    if (failures > 0) {
      console.log(`${failures} requests failed - working in offline mode`)
      errorStore.setError(t('offline_mode'))
    }
  }

  // Проверяем авторизацию (но не блокируем на этом)
  try {
    if (!authStore.isConnected) {
      await authStore.verifyToken()
    }
    await loadData()
    marketStore.startRealTimeUpdates()
  } catch (error) {
    console.log('Auth or data loading failed:', error.message)
    // Все равно пробуем загрузить данные
    await loadData()
  }
})

onUnmounted(() => {
  console.log('MainView unmounted, cleaning up...')
  if (marketStore.stopRealTimeUpdates) {
    marketStore.stopRealTimeUpdates()
  }
})
</script>
