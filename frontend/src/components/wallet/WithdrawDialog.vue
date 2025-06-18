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
          {{ $t('withdraw_info', { receive: (amount - 0.1).toFixed(2) }) }} (0.1 TON — {{ $t('fee') }})
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

const withdraw = useDebounceFn(async () => {
  if (!authStore.walletAddress) {
    console.error('[WithdrawDialog] Wallet not connected:', authStore.walletAddress);
    errorStore.setError(t('error.connect_wallet'));
    return;
  }

  isProcessing.value = true;
  try {
    console.log('[WithdrawDialog] Withdraw params:', { amount: amount.value, receive: amount.value - 0.1 });
    console.log('[WithdrawDialog] Wallet Address:', authStore.walletAddress);

    const result = await walletStore.withdraw(amount.value);
    console.log('[WithdrawDialog] Transaction result:', result);

    errorStore.setError(t('withdraw_initiated'), false);
    emit('withdraw-success');
    closeDialog();
  } catch (error) {
    console.error('[WithdrawDialog] Withdraw error:', error);
    errorStore.setError(t('failed_to_initiate_withdraw'));
  } finally {
    isProcessing.value = false;
  }
}, 300);

const closeDialog = () => {
  internalModelValue.value = false;
  amount.value = 0.11;
};
</script>
