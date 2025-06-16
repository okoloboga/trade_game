<template>
  <v-dialog v-model="internalModelValue" max-width="320">
    <v-card color="black">
      <v-card-title>{{ $t('withdraw_ton') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amount"
          :label="$t('amount_label')"
          type="number"
          :max="walletStore.balance"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="withdrawRules"
        />
        <v-alert type="info" variant="tonal" class="mt-2">
          {{ $t('withdraw') }} {{ tonAmount }} TON {{ $t('to_your_wallet') }}
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
import { formatTonAmount } from '@/utils/formatters';
import { validateAmount } from '@/utils/validators';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const amount = ref(0.1);

// Computed для v-model
const internalModelValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

const withdrawRules = computed(() => [
  (v) => validateAmount(v, walletStore.balance) === true || validateAmount(v, walletStore.balance),
]);

const isValid = computed(() => validateAmount(amount.value, walletStore.balance) === true);

const tonAmount = computed(() => formatTonAmount(amount.value, walletStore.tonPrice));

const withdraw = useDebounceFn(async () => {
  try {
    await walletStore.withdraw(amount.value);
    errorStore.setError(t('withdraw_initiated'), false);
    closeDialog();
  } catch (error) {
    console.error('[WithdrawDialog] Withdraw error:', error);
    errorStore.setError(t('failed_to_initiate_withdraw'));
  }
}, 300);

const closeDialog = () => {
  internalModelValue.value = false;
  amount.value = 0.1;
};
</script>
