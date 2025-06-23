<template>
  <v-dialog v-model="internalModelValue" max-width="320">
    <v-card color="#1e1e1e">
      <v-card-title>{{ $t('deposit_ton') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="price"
          :label="$t('amount_ton')"
          type="number"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
          :rules="depositRules"
        />
        <div class="text-body-2 text-white mt-2">
          {{ $t('deposit_address') }}: {{ walletStore.depositAddress }}
        </div>
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
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';
import { useTonConnectUI } from '@townsquarelabs/ui-vue';
import apiService from '@/services/api';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue', 'deposit-success']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const authStore = useAuthStore();
const [tonConnectUI] = useTonConnectUI();
const price = ref(0.01);
const isProcessing = ref(false);

const depositRules = computed(() => [
  (v) => validateAmount(v, Infinity, 0.01) === true || t('error.invalid_amount'),
]);

const isValid = computed(() => validateAmount(price.value, Infinity, 0.01) === true);

const deposit = useDebounceFn(async () => {
  if (!tonConnectUI.connected) {
    console.log('[DepositDialog] Wallet not connected, opening modal');
    errorStore.setError(t('error.connect_wallet'));
    try {
      await tonConnectUI.openModal();
      if (!tonConnectUI.connected) {
        throw new Error('Wallet not connected after modal');
      }
    } catch (connectError) {
      console.error('[DepositDialog] Modal open failed:', connectError);
      errorStore.setError(t('error.failed_to_connect_wallet'));
      return;
    }
  }

  if (!walletStore.depositAddress) {
    console.error('[DepositDialog] No deposit address available');
    errorStore.setError(t('error.no_deposit_address'));
    return;
  }

  isProcessing.value = true;
  try {
    const nanoAmount = Math.floor(price.value * 1_000_000_000).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // Увеличено до 10 минут
      messages: [
        {
          address: walletStore.depositAddress, // Используем depositAddress
          amount: nanoAmount,
        },
      ],
    };

    console.log('[DepositDialog] Sending transaction:', transaction);
    const result = await tonConnectUI.sendTransaction(transaction);
    console.log('[DepositDialog] Transaction result:', result);
    const txHash = result.boc; // Используем boc как txHash

    const response = await apiService.deposit({
      tonAddress: authStore.user.ton_address,
      amount: price.value,
      txHash,
    });

    console.log('[DepositDialog] Deposit response:', response);
    await walletStore.fetchBalances();
    errorStore.setError(t('deposit_success'), false);
    emit('deposit-success');
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
  price.value = 0.01;
};

const internalModelValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});
</script>
