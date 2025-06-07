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
        {{ $t('cancel') }}
      </v-btn>
    </template>
  </v-data-table>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useTradingStore } from '@/stores/trading'
import { useErrorStore } from '@/stores/error'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const tradingStore = useTradingStore()
const errorStore = useErrorStore()
const loading = ref(false)

const headers = computed(() => [
  { title: t('trade_headers.type'), key: 'type' },
  { title: t('trade_headers.amount'), key: 'amount' },
  { title: t('trade_headers.entry_price'), key: 'entry_price' },
  { title: t('trade_headers.date'), key: 'created_at' },
  { title: t('trade_headers.actions'), key: 'actions'},
])

const cancelTrade = async (tradeId) => {
  try {
    await tradingStore.cancelTrade(tradeId)
    errorStore.setError(t('trade_cancel'), false)
  } catch (error) {
    errorStore.setError(t('failed_to_cancel_trade'))
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await tradingStore.fetchActiveTrades()
  } catch (error) {
    errorStore.setError(t('load_active_trades'))
  } finally {
    loading.value = false
  }
})
</script>
<style scope>
.v-data-table {
  border-radius: 8px;
}
</style>
