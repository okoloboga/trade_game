<template>
  <v-data-table
    :headers="headers"
    :items="walletStore.transactions"
    :items-per-page="5"
    :loading="loading"
    class="elevation-1"
  >
    <template v-slot:item.amount="{ item }">
      {{ formatCurrency(item.amount) }}
    </template>
    <template v-slot:item.created_at="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </v-data-table>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import { useI18n } from 'vue-i18n'
import { formatCurrency, formatDate } from '@/utils/formatters'

const walletStore = useWalletStore()
const errorStore = useErrorStore()
const loading = ref(false)
const { t } = useI18n()

const headers = computed(() => [
  { title: t('transaction_headers.type'), key: 'type' },
  { title: t('transaction_headers.amount'), key: 'amount' },
  { title: t('transaction_headers.status'), key: 'status' },
  { title: t('transaction_headers.date'), key: 'created_at' },
])

onMounted(async () => {
  loading.value = true
  try {
    await walletStore.fetchTransactions()
  } catch (error) {
    errorStore.setError(t('load_transaction_history'))
  } finally {
    loading.value = false
  }
})
</script>
