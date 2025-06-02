<template>
  <v-container fluid>
    <TradingStats />
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="trades">Trades</v-tab>
      <v-tab value="transactions">Transactions</v-tab>
    </v-tabs>
    <v-window v-model="activeTab">
      <v-window-item value="trades">
        <TradeHistory />
      </v-window-item>
      <v-window-item value="transactions">
        <TransactionHistory />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useErrorStore } from '@/stores/error'
import TradingStats from '@/components/stats/TradingStats.vue'
import TradeHistory from '@/components/history/TradeHistory.vue'
import TransactionHistory from '@/components/history/TransactionHistory.vue'

const activeTab = ref('trades')
const authStore = useAuthStore()
const errorStore = useErrorStore()

onMounted(async () => {
  if (!authStore.isConnected) {
    try {
      await authStore.verifyToken()
    } catch {
      errorStore.setError('Please connect wallet')
    }
  }
})
</script>
