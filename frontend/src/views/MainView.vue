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
import { useMarketStore } from '@/stores/market';
import { useTradingStore } from '@/stores/trading';
import { useAuthStore } from '@/stores/auth';
import { useErrorStore } from '@/stores/error';
import TradingChart from '@/components/trading/TradingChart.vue';
import TradeButtons from '@/components/trading/TradeButtons.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const marketStore = useMarketStore();
const tradingStore = useTradingStore();
const authStore = useAuthStore();
const errorStore = useErrorStore();

/**
 * Loads initial data for the main view (candles, price, trade history).
 */
const loadData = async () => {
  const results = await Promise.allSettled([
    marketStore.fetchCandles('TON-USDT', '5m').catch(e => console.error('Candles fetch failed:', e.message)),
    marketStore.fetchCurrentPrice('TON-USDT').catch(e => console.error('Price fetch failed:', e.message)),
    tradingStore.fetchTradeHistory().catch(e => console.error('Trade history fetch failed:', e.message)),
  ]);

  const failures = results.filter(r => r.status === 'rejected').length;
  if (failures > 0) {
    errorStore.setError(t('offline_mode'));
  }
};

/**
 * Initializes the main view, setting up data and real-time updates.
 */
onMounted(async () => {
  errorStore.clearError();
  try {
    await authStore.init(); // Restore session
    marketStore.setMainPage(true);
    await loadData();
    marketStore.startRealTimeUpdates('TON-USDT');
  } catch (error) {
    console.error('Data loading failed:', error.message);
    await loadData();
  }
});

/**
 * Cleans up the main view, stopping real-time updates.
 */
onUnmounted(() => {
  marketStore.setMainPage(false);
  marketStore.stopRealTimeUpdates();
});
</script>
