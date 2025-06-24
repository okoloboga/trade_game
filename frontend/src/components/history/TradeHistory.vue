<template>
  <v-data-table
    :headers="headers"
    :items="tradingStore.tradeHistory"
    :items-per-page="5"
    :loading="loading"
    class="elevation-1"
  >
    <template v-slot:item.profit_loss="{ item }">
      <span :class="Number(item.profit_loss) > 0 ? 'green--text' : 'red--text'">
        {{ formatCurrency(Number(item.profit_loss)) }}
      </span>
    </template>
    <template v-slot:item.created_at="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </v-data-table>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useTradingStore } from '@/stores/trading'
import { useErrorStore } from '@/stores/error'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { formatCurrency, formatDate } from '@/utils/formatters'

const tradingStore = useTradingStore()
const errorStore = useErrorStore()
const authStore = useAuthStore()
const loading = ref(false)
const { t } = useI18n()

const headers = computed(() => [
  { title: t('trade_headers.type'), key: 'type' },
  { title: t('trade_headers.amount'), key: 'amount' },
  { title: t('trade_headers.profit_loss'), key: 'profit_loss' },
  { title: t('trade_headers.date'), key: 'created_at' },
])

onMounted(async () => {
  console.log('authStore.isConnected:', authStore.isConnected);
  console.log('authStore.user:', authStore.user);
  console.log('authStore.user.ton_address:', authStore.user?.ton_address);
  console.log('[TradeHistory] tradeHistory:', tradingStore.tradeHistory);
  loading.value = true
  try {
    await tradingStore.fetchTradeHistory()
  } catch (error) {
    errorStore.setError(t('load_trade_history'))
  } finally {
    loading.value = false
  }
})
</script>
