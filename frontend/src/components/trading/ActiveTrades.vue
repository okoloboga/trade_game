<template>
  <v-data-table
    :headers="headers"
    :items="tradingStore.activeTrades"
    :items-per-page="5"
    :loading="loading"
    class="elevation-1"
  >
    <template v-slot:item.entry_price="{ item }">
      {{ formatCurrency(item.entry_price) }}
    </template>
    <template v-slot:item.created_at="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
    <template v-slot:item.actions="{ item }">
      <v-btn
        color="red"
        size="small"
        :loading="tradingStore.isProcessing"
        @click="cancelTrade(item.id)"
      >
        Cancel
      </v-btn>
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
  { title: 'Date', key: 'created_at' },
  { title: 'Actions', key: 'actions' },
]

const cancelTrade = async (tradeId) => {
  try {
    await tradingStore.cancelTrade(tradeId)
    errorStore.setError('Trade cancelled successfully', false)
  } catch (error) {
    errorStore.setError('Failed to cancel trade')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await tradingStore.fetchActiveTrades()
  } catch (error) {
    errorStore.setError('Failed to load active trades')
  } finally {
    loading.value = false
  }
})
</script>
