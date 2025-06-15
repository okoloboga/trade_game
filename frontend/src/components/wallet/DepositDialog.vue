```vue
<template>
  <v-dialog :value="modelValue" @update:modelValue="emit('update:modelValue', $event)" max-width="320" class="deposit-dialog">
    <v-card color="black">
      <v-card-title>{{ $t('deposit_ton') }}</v-card-title>
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
          {{ $t('send') }} {{ tonAmount }} TON {{ $t('to') }} {{ walletStore.depositAddress || '...' }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">{{ $t('cancel') }}</v-btn>
        <v-btn
          color="primary"
          :loading="walletStore.isProcessing"
          :disabled="!isValid"
          @click="deposit"
        >
          {{ $t("deposit") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useWalletStore } from '@/stores/wallet';
import { useErrorStore } from '@/stores/error';
import { useDebounceFn } from '@vueuse/core';
import { formatTonAmount } from '@/utils/formatters';
import { validateAmount } from '@/utils/validators';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const amount = ref(0.1);

console.log('[DepositDialog] Initial modelValue:', props.modelValue);

watch(() => props.modelValue, (newValue) => {
  console.log('[DepositDialog] modelValue changed:', newValue);
});

const depositRules = computed(() => [
  v => validateAmount(v, 10) === true || validateAmount(v, 10),
]);

const isValid = computed(() => validateAmount(amount.value, 10) === true);

const tonAmount = computed(() => formatTonAmount(amount.value, walletStore.tonPrice));

const deposit = useDebounceFn(async () => {
  try {
    await walletStore.deposit(amount.value);
    errorStore.setError(t('deposit_initiated'), false);
    closeDialog();
  } catch (error) {
    errorStore.setError(t('failed_to_initiate_deposit'));
  }
}, 300);

const closeDialog = () => {
  console.log('[DepositDialog] Closing dialog');
  emit('update:modelValue', false);
  amount.value = 0.1;
};
</script>

<style scoped>
.deposit-dialog {
  z-index: 2000 !important;
}
</style>
