<template>
  <v-card color="black" class="mb-4">
    <v-card-title>
      Trading Statistics
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
            <div class="text-caption">Total P&L</div>
          </div>
        </v-col>
        <v-col cols="6">
          <div class="text-center">
            <div class="text-h3">{{ tradingStore.tradeHistory.length.toLocaleString('en-US') }}</div>
            <div class="text-caption">Total Trades</div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTradingStore } from '@/stores/trading'
import { useErrorStore } from '@/stores/error'
import apiService from '@/services/api'
import { formatCurrency } from '@/utils/formatter'

const authStore = useAuthStore()
const tradingStore = useTradingStore()
const errorStore = useErrorStore()
const period = ref('1d')
const periods = ['1d', '1w']
const summary = ref({
  totalProfitLoss: { usd: 0 },
  totalVolume: { usd: 0 },
})

const profitClass = computed(() => ({
  'green--text': summary.value.totalProfitLoss.usd > 0,
  'red--text': summary.value.totalProfitLoss.usd < 0,
  'white--text': summary.value.totalProfitLoss.usd === 0,
}))

const fetchStats = async () => {
  if (!authStore.isConnected || !authStore.user?.id) {
    errorStore.setError('Please connect wallet')
    return
  }
  try {
    const [summaryResponse] = await Promise.all([
      apiService.getSummary(period.value),
      tradingStore.fetchTradeHistory(period.value),
    ])
    summary.value = summaryResponse
  } catch (error) {
    errorStore.setError('Failed to load trading stats')
  }
}

onMounted(fetchStats)
watch(period, fetchStats)
</script>
