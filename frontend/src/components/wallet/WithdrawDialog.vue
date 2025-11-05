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
import { useTonConnectUI } from '@townsquarelabs/ui-vue';
import { useAuthStore } from '@/stores/auth';
import apiService from '@/services/api';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue', 'withdraw-success']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const authStore = useAuthStore();
const [tonConnectUI] = useTonConnectUI();
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
 * Initiates a withdrawal transaction to the smart contract.
 */
const withdraw = useDebounceFn(async () => {
  if (!tonConnectUI.connected) {
    errorStore.setError(t('error.connect_wallet'));
    try {
      await tonConnectUI.openModal();
      if (!tonConnectUI.connected) {
        throw new Error('Wallet not connected after modal');
      }
    } catch (connectError) {
      console.error('[WithdrawDialog] Modal open failed:', connectError);
      errorStore.setError(t('error.failed_to_connect_wallet'));
      return;
    }
  }

  if (!isValid.value) return;

  isProcessing.value = true;
  try {
    // Prepare withdrawal transaction on backend
    const { boc, contractAddress } = await apiService.prepareWithdrawal({ amount: amount.value });

    if (!boc || !contractAddress) {
      throw new Error('Failed to prepare withdrawal transaction.');
    }

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60 seconds
      messages: [
        {
          address: contractAddress,
          amount: Math.floor(0.05 * 1_000_000_000).toString(), // 0.05 TON for gas
          payload: boc,
        },
      ],
    };

    const result = await tonConnectUI.sendTransaction(transaction);
    const txHash = result.boc;

    // Process withdrawal on backend to sync balance with on-chain balance
    const response = await apiService.withdraw({
      tonAddress: authStore.user.ton_address,
      amount: amount.value,
      txHash,
    });

    await walletStore.fetchBalances();
    emit('withdraw-success');
    closeDialog();
  } catch (error) {
    console.error('[WithdrawDialog] Withdraw error:', error);
    errorStore.setError(t('error.failed_to_initiate_withdraw') || 'Failed to process withdrawal');
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
