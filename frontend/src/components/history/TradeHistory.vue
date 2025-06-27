<template>
  <v-data-table
    :headers="headers"
    :items="tradingStore.tradeHistory"
    :items-per-page="5"
    :loading="loading"
    class="elevation-1"
  >
    <template v-slot:item.type="{ item }">
      {{ item.type === 'buy' ? $t('buy') : $t('sell') }}
    </template>
    <template v-slot:item.amount="{ item }">
      {{ Number(item.amount).toFixed(2) }}$
    </template>
    <template v-slot:item.profit_loss="{ item }">
      <span v-if="item.type === 'buy'">-</span>
      <span v-else :class="Number(item.profit_loss) > 0 ? 'green--text' : 'red--text'">
        {{ formatCurrency(Number(item.profit_loss)) }}
      </span>
    </template>
    <template v-slot:item.created_at="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </v-data-table>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useTradingStore } from '@/stores/trading';
import { useMarketStore } from '@/stores/market';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';
import { formatCurrency, formatDate } from '@/utils/formatters';

const tradingStore = useTradingStore();
const marketStore = useMarketStore();
const errorStore = useErrorStore();
const authStore = useAuthStore();
const loading = ref(false);
const { t } = useI18n();

const currentPrice = computed(() => marketStore.currentPrice || 0);

const headers = computed(() => [
  { title: t('trade_headers.type'), key: 'type' },
  { title: t('trade_headers.amount'), key: 'amount' },
  { title: t('trade_headers.profit_loss'), key: 'profit_loss' },
  { title: t('trade_headers.date'), key: 'created_at' },
]);

/**
 * Fetches trade history on component mount.
 */
onMounted(async () => {
  loading.value = true;
  try {
    await tradingStore.fetchTradeHistory();
  } catch (error) {
    console.error('[TradeHistory] Failed to load trade history:', error);
    errorStore.setError(t('load_trade_history'));
  } finally {
    loading.value = false;
  }
});
</script>
