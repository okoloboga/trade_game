<template>
  <v-card color="black" class="mb-4">
    <v-card-title>
      {{ $t('trading_stats') }}
      <v-spacer />
      <v-select
        v-model="period"
        :items="periods"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 100px"
      />
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <div class="text-center">
            <div class="text-h3" :class="profitClass">
              {{ formatCurrency(summary.totalProfitLoss.usd) }}
            </div>
            <div class="text-caption">{{ $t('total_pl') }}</div>
          </div>
        </v-col>
        <v-col cols="6">
          <div class="text-center">
            <div class="text-h3">{{ tradingStore.tradeHistory.length.toLocaleString('en-US') }}</div>
            <div class="text-caption">{{ $t('total_trades') }}</div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useTradingStore } from '@/stores/trading';
import { useErrorStore } from '@/stores/error';
import apiService from '@/services/api';
import { formatCurrency } from '@/utils/formatters';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const authStore = useAuthStore();
const tradingStore = useTradingStore();
const errorStore = useErrorStore();
const period = ref('1d');
const periods = ['1d', '1w'];
const summary = ref({
  totalProfitLoss: { usd: 0 },
  totalVolume: { usd: 0 },
});

const profitClass = computed(() => ({
  'green--text': summary.value.totalProfitLoss.usd > 0,
  'red--text': summary.value.totalProfitLoss.usd < 0,
  'white--text': summary.value.totalProfitLoss.usd === 0,
}));

const fetchStats = async () => {
  if (!authStore.isConnected || !authStore.user?.ton_address) {
    errorStore.setError(t('wallet_connect'));
    return;
  }
  try {
    console.log('[TradingStats] Fetching stats for period:', period.value);
    const [summaryResponse] = await Promise.all([
      apiService.getSummary(period.value),
      tradingStore.fetchTradeHistory(period.value),
    ]);
    summary.value = summaryResponse;
    console.log('[TradingStats] Stats fetched:', summary.value);
  } catch (error) {
    console.error('[TradingStats] Failed to fetch stats:', error);
    errorStore.setError(t('load_trading_stats'));
  }
};

onMounted(fetchStats);
watch(period, fetchStats);
</script>
