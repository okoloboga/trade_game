<template>
  <v-card color="black" class="trade-buttons">
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <v-text-field
            v-model.number="amount"
            label="Amount ($)"
            type="number"
            :max="1"
            :min="0.01"
            step="0.01"
            variant="outlined"
            color="white"
            :rules="amountRules"
          />
        </v-col>
        <v-col cols="6">
          <div class="text-h5 text-white">
            ${{ marketStore.currentPrice?.toFixed(2) ?? '--' }}
          </div>
        </v-col>
      </v-row>
      <v-row class="mt-4">
        <v-col cols="6">
          <v-btn
            block
            size="large"
            color="green"
            :loading="loading"
            @click="placeTrade('long')"
            :disabled="!canTrade"
          >
            BUY / LONG
          </v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn
            block
            size="large"
            color="red"
            :loading="loading"
            @click="placeTrade('short')"
            :disabled="!canTrade"
          >
            SELL / SHORT
          </v-btn>
        </v-col>
      </v-row>
      <ActiveTrades class="mt-4" />
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useTradingStore } from '@/stores/trading'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import ActiveTrades from './ActiveTrades.vue'
import { useDebounceFn } from '@vueuse/core'
import { validateAmount } from '@/utils/validator'

const amount = ref(0.1)
const marketStore = useMarketStore()
const tradingStore = useTradingStore()
const walletStore = useWalletStore()
const errorStore = useErrorStore()
const loading = ref(false)

const amountRules = computed(() => [
  v => validateAmount(v, 1) === true || validateAmount(v, 1),
  v => (v <= walletStore.balance || 'Insufficient balance'),
])

const canTrade = computed(() => {
  return validateAmount(amount.value, 1) === true && amount.value <= walletStore.balance
})

const placeTrade = useDebounceFn(async (type) => {
  loading.value = true
  try {
    await tradingStore.placeTrade({
      type,
      amount: amount.value,
      symbol: 'BTC-USDT',
    })
    errorStore.setError('Trade placed successfully', false)
    amount.value = 0.1
  } catch (error) {
    errorStore.setError('Failed to place trade')
  } finally {
    loading.value = false
  }
}, 300)
</script>
