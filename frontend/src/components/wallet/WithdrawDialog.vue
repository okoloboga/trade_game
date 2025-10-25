<template>
  <v-dialog v-model="internalModelValue" max-width="320">
    <v-card color="#1e1e1e">
      <v-card-title>{{ $t('withdraw_ton') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amount"
          :label="$t('amount_ton')"
          type="number"
          :min="0.11"
          :max="walletStore.balance"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="withdrawRules"
        />
        <v-alert type="info" variant="tonal" class="mt-2">
          {{ $t('withdraw_info_new') }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">{{ $t('cancel') }}</v-btn>
        <v-btn
          color="primary"
          :loading="isProcessing"
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
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue', 'withdraw-success']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const amount = ref(0.11);
const isProcessing = ref(false);

const internalModelValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

const withdrawRules = computed(() => [
  (v) => validateAmount(v, walletStore.balance, 0.11) === true || t('error.invalid_amount_withdraw'),
]);

const isValid = computed(() => validateAmount(amount.value, walletStore.balance, 0.11) === true);

/**
 * Initiates a decentralized withdrawal by preparing the transaction on the backend
 * and sending it to the user's wallet for confirmation.
 */
const withdraw = useDebounceFn(async () => {
  if (!isValid.value) return;

  isProcessing.value = true;
  try {
    await walletStore.withdrawTon(amount.value);
    emit('withdraw-success');
    closeDialog();
  } catch (error) {
    // Error is already handled in the wallet store, no need to set it again
    console.error('[WithdrawDialog] Withdraw error:', error);
  } finally {
    isProcessing.value = false;
  }
}, 300);

/**
 * Closes the withdraw dialog and resets the input amount.
 */
const closeDialog = () => {
  internalModelValue.value = false;
  amount.value = 0.11;
};
</script>
