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
import { onMounted, onUnmounted } from 'vue';
import apiService from '@/services/api';
import { useMarketStore } from '@/stores/market';
import { useTradingStore } from '@/stores/trading';
import { useAuthStore } from '@/stores/auth';
import { useErrorStore } from '@/stores/error';
import TradingChart from '@/components/trading/TradingChart.vue';
import TradeButtons from '@/components/trading/TradeButtons.vue';
import ActiveTrades from '@/components/trading/ActiveTrades.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const marketStore = useMarketStore();
const tradingStore = useTradingStore();
const authStore = useAuthStore();
const errorStore = useErrorStore();

onMounted(async () => {
  console.log('MainView mounted, initializing...');
  errorStore.clearError();

  const loadData = async () => {
    const results = await Promise.allSettled([
      apiService.getCandles('BTC-USD', '1m').catch(e => console.log('Candles fetch failed:', e.message)),
      apiService.getCurrentPrice('BTC-USD').catch(e => console.log('Price fetch failed:', e.message)),
      tradingStore.fetchTradeHistory().catch(e => console.log('Trade history fetch failed:', e.message)),
      tradingStore.fetchActiveTrades().catch(e => console.log('Active trades fetch failed:', e.message)),
    ]);

    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
      console.log(`${failures} requests failed - working in offline mode`);
      errorStore.setError(t('offline_mode'));
    }
  };

  try {
    await authStore.init(); // Восстанавливаем сессию
    await loadData();
    marketStore.startRealTimeUpdates();
  } catch (error) {
    console.error('Data loading failed:', error.message);
    await loadData(); // Пробуем загрузить данные даже при ошибке
  }
});

onUnmounted(() => {
  console.log('MainView unmounted, cleaning up...');
  if (marketStore.stopRealTimeUpdates) {
    marketStore.stopRealTimeUpdates();
  }
});
</script>
