<template>
  <v-dialog v-model="internalModelValue" max-width="320">
    <v-card color="#1e1e1e">
      <v-card-title>{{ $t('deposit_ton') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amount"
          :label="$t('amount_ton')"
          type="number"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="depositRules"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">{{ $t('cancel') }}</v-btn>
        <v-btn
          color="primary"
          :loading="isProcessing"
          :disabled="!isValid"
          @click="deposit"
        >
          {{ $t('deposit') }}
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
import { useTonWallet, useTonConnectUI } from '@townsquarelabs/ui-vue';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const { tonConnectUI } = useTonConnectUI();
const wallet = useTonWallet();
const amount = ref(0.01);
const isProcessing = ref(false);

// Computed для v-model
const internalModelValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

const depositRules = computed(() => [
  (v) => validateAmount(v, Infinity) === true || t('invalid_amount'),
]);

const isValid = computed(() => validateAmount(amount.value, Infinity) === true);

const deposit = useDebounceFn(async () => {
  if (!wallet) {
    errorStore.setError(t('error.connect_wallet'));
    return;
  }

  isProcessing.value = true;
  try {
    // Конвертация TON в нанотоны (1 TON = 1,000,000,000 нанотонов)
    const nanoAmount = Math.floor(amount.value * 1_000_000_000).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60 секунд
      messages: [
        {
          address: import.meta.env.VITE_TON_CENTRAL_WALLET,
          amount: nanoAmount,
        },
      ],
    };

    // Отправка транзакции через TonConnect
    const result = await tonConnectUI.sendTransaction(transaction);
    const txHash = result.boc; // Предполагаем, что boc можно использовать как txHash

    // Вызов deposit с txHash и дополнительными параметрами
    await walletStore.deposit({
      amount: amount.value, // В TON для бэкенда
      txHash,
      tonProof: wallet.tonProof, // Предполагаем, что tonProof доступен
      account: wallet.account, // Предполагаем, что account доступен
      clientId: wallet.device.appName, // Используем appName как clientId
    });

    errorStore.setError(t('error.deposit_initiated'), false);
    closeDialog();
  } catch (error) {
    console.error('[DepositDialog] Deposit error:', error);
    errorStore.setError(t('error.failed_to_initiate_deposit'));
  } finally {
    isProcessing.value = false;
  }
}, 300);

const closeDialog = () => {
  internalModelValue.value = false;
  amount.value = 0.01;
};
</script>
