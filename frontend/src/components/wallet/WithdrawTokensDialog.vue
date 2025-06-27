```vue
<template>
  <v-dialog v-model="internalModelValue" max-width="320">
    <v-card color="black">
      <v-card-title>{{ $t('withdraw_ruble') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amount"
          :label="$t('amount_label_ruble')"
          type="number"
          :max="walletStore.tokenBalance"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="withdrawRules"
        />
        <v-alert type="info" variant="tonal" class="mt-2">
          {{ $t('withdraw') }} {{ amount }} RUBLE {{ $t('to_your_wallet') }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">{{ $t('cancel') }}</v-btn>
        <v-btn
          color="primary"
          :loading="walletStore.isProcessing"
          :disabled="!isValid"
          @click="withdraw"
        >
          {{ $t('withdraw') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useWalletStore } from '@/stores/wallet';
import { useErrorStore } from '@/stores/error';
import { useDebounceFn } from '@vueuse/core';
import { validateAmount } from '@/utils/validators';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue', 'withdraw-success']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const authStore = useAuthStore();
const amount = ref(0.1);

const internalModelValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

const withdrawRules = computed(() => [
  (v) => validateAmount(v, walletStore.tokenBalance) === true || t('error.invalid_amount_withdraw'),
]);

const isValid = computed(() => validateAmount(amount.value, walletStore.tokenBalance) === true);

/**
 * Initiates a withdrawal transaction for RUBLE tokens.
 */
const withdraw = useDebounceFn(async () => {
  if (!authStore.isConnected || !authStore.user?.ton_address) {
    console.error('[WithdrawTokensDialog] Wallet not connected:', authStore.user?.ton_address);
    errorStore.setError(t('error.connect_wallet'));
    return;
  }

  try {
    const response = await walletStore.withdrawTokens(amount.value);
    errorStore.setError(t('ruble_withdraw_initiated'), false);
    emit('withdraw-success');
    closeDialog();
  } catch (error) {
    console.error('[WithdrawTokensDialog] Withdraw error:', error);
    errorStore.setError(t('error.failed_to_initiate_ruble_withdraw'));
  }
}, 300);

/**
 * Closes the withdraw dialog and resets the input amount.
 */
const closeDialog = () => {
  internalModelValue.value = false;
  amount.value = 0.1;
};
</script>
