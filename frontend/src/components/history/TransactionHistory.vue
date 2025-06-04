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
import { ref, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import { formatCurrency, formatDate } from '@/utils/formatters'

const walletStore = useWalletStore()
const errorStore = useErrorStore()
const loading = ref(false)

const headers = [
  { title: 'Type', key: 'type' },
  { title: 'Amount', key: 'amount' },
  { title: 'Status', key: 'status' },
  { title: 'Date', key: 'created_at' },
]

onMounted(async () => {
  loading.value = true
  try {
    await walletStore.fetchTransactions()
  } catch (error) {
    errorStore.setError('Failed to load transaction history')
  } finally {
    loading.value = false
  }
})
</script>
