<template>
  <v-data-table
    :headers="headers"
    :items="tradingStore.tradeHistory"
    :items-per-page="5"
    :loading="loading"
    class="elevation-1"
  >
    <template v-slot:item.profit_loss="{ item }">
      <span :class="item.profit_loss > 0 ? 'green--text' : 'red--text'">
        {{ formatCurrency(item.profit_loss) }}
      </span>
    </template>
    <template v-slot:item.created_at="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </v-data-table>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTradingStore } from '@/stores/trading'
import { useErrorStore } from '@/stores/error'
import { useI18n } from 'vue-i18n'
import { formatCurrency, formatDate } from '@/utils/formatters'

const tradingStore = useTradingStore()
const errorStore = useErrorStore()
const loading = ref(false)
const { t } = useI18n()

const headers = [
  { title: t('trade_headers.type'), key: 'type' },
  { title: t('trade_headers.amount'), key: 'amount' },
  { title: t('trade_headers.entry_price'), key: 'entry_price' },
  { title: t('trade_headers.profit_loss'), key: 'profit_loss' },
  { title: t('trade_headers.date'), key: 'created_at' },
]

onMounted(async () => {
  loading.value = true
  try {
    await tradingStore.fetchTradeHistory()
  } catch (error) {
    errorStore.setError('Failed to load trade history')
  } finally {
    loading.value = false
  }
})
</script>
