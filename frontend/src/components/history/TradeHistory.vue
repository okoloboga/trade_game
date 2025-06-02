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
import { formatCurrency, formatDate } from '@/utils/formatter'

const tradingStore = useTradingStore()
const errorStore = useErrorStore()
const loading = ref(false)

const headers = [
  { title: 'Type', key: 'type' },
  { title: 'Amount', key: 'amount' },
  { title: 'Entry Price', key: 'entry_price' },
  { title: 'P&L', key: 'profit_loss' },
  { title: 'Date', key: 'created_at' },
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
