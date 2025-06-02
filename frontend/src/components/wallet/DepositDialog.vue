<template>
  <v-dialog v-model="modelValue" max-width="320">
    <v-card color="black">
      <v-card-title>Deposit TON</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amount"
          label="Amount ($)"
          type="number"
          :max="10"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="depositRules"
        />
        <v-alert type="info" variant="tonal" class="mt-2">
          Send {{ tonAmount }} TON to {{ walletStore.depositAddress || '...' }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="walletStore.isProcessing"
          :disabled="!isValid"
          @click="deposit"
        >
          Deposit
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
import { formatTonAmount } from '@/utils/formatter'
import { validateAmount } from '@/utils/validator'

const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
const walletStore = useWalletStore()
const errorStore = useErrorStore()
const amount = ref(0.1)

const depositRules = computed(() => [
  v => validateAmount(v, 10) === true || validateAmount(v, 10),
])

const isValid = computed(() => validateAmount(amount.value, 10) === true)

const tonAmount = computed(() => formatTonAmount(amount.value, walletStore.tonPrice))

const deposit = useDebounceFn(async () => {
  try {
    await walletStore.deposit(amount.value)
    errorStore.setError('Deposit initiated. Please send TON.', false)
    closeDialog()
  } catch (error) {
    errorStore.setError('Failed to initiate deposit')
  }
}, 300)

const closeDialog = () => {
  emit('update:modelValue', false)
  amount.value = 0.1
}
</script>
