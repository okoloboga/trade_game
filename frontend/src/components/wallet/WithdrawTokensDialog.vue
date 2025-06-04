<template>
  <v-dialog :value="modelValue" @update:modelValue="emit('update:modelValue', $event)" max-width="320">
    <v-card color="black">
      <v-card-title>Withdraw RUBLE</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amount"
          label="Amount (RUBLE)"
          type="number"
          :max="walletStore.tokenBalance"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="withdrawRules"
        />
        <v-alert type="info" variant="tonal" class="mt-2">
          Withdraw {{ amount }} RUBLE to your wallet
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="walletStore.isProcessing"
          :disabled="!isValid"
          @click="withdraw"
        >
          Withdraw
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import { useDebounceFn } from '@vueuse/core'
import { validateAmount } from '@/utils/validators'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
const walletStore = useWalletStore()
const errorStore = useErrorStore()
const amount = ref(0.1)

const withdrawRules = computed(() => [
  v => validateAmount(v, walletStore.tokenBalance) === true || validateAmount(v, walletStore.tokenBalance),
])

const isValid = computed(() => validateAmount(amount.value, walletStore.tokenBalance) === true)

const withdraw = useDebounceFn(async () => {
  try {
    await walletStore.withdrawTokens(amount.value)
    errorStore.setError('RUBLE withdrawal initiated', false)
    closeDialog()
  } catch (error) {
    errorStore.setError('Failed to initiate RUBLE withdrawal')
  }
}, 300)

const closeDialog = () => {
  emit('update:modelValue', false)
  amount.value = 0.1
}
</script>
