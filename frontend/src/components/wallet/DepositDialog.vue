```vue
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
import { useTonWallet, useTonConnectUI, useTonAddress, useIsConnectionRestored, useTonConnectModal } from '@townsquarelabs/ui-vue';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const [tonConnectUI, setOptions] = useTonConnectUI(); // Используем массив
const { state: modalState, open: openModal, close: closeModal } = useTonConnectModal(); // Для модального окна
const wallet = useTonWallet();
const authStore = useAuthStore();
const userFriendlyAddress = useTonAddress(true);
const connectionRestored = useIsConnectionRestored();
const price = ref(0.01);
const isProcessing = ref(false);

const transaction = ref({
  validUntil: Math.floor(Date.now() / 1000) + 60,
  messages: [
    {
      address: import.meta.env.VITE_TON_CENTRAL_WALLET,
      amount: '1000000000',
    },
  ],
});

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

const isValid = computed(() => validateAmount(price.value, Infinity) === true);

const deposit = useDebounceFn(async () => {
  if (!tonConnectUI.connected || !userFriendlyAddress.value || !wallet) {
    console.error('[DepositDialog] Wallet not connected:', {
      connected: tonConnectUI.connected,
      userFriendlyAddress: userFriendlyAddress.value,
      wallet,
      connectionRestored,
    });
    errorStore.setError(t('error.connect_wallet'));
    try {
      console.log('[DepositDialog] Opening modal for wallet connection');
      await openModal();
      if (!tonConnectUI.connected) {
        throw new Error('Wallet not connected after modal');
      }
    } catch (connectError) {
      console.error('[DepositDialog] Modal open failed:', connectError);
      errorStore.setError(t('error.failed_to_connect_wallet'));
      return;
    }
  }

  isProcessing.value = true;
  try {
    const nanoAmount = Math.floor(price.value * 1_000_000_000).toString();
    transaction.value = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: import.meta.env.VITE_TON_CENTRAL_WALLET,
          amount: nanoAmount,
        },
      ],
    };

    const result = await tonConnectUI.sendTransaction(transaction.value);
    const txHash = result?.boc || result?.transactionHash || 'unknown';

    console.log('[DepositDialog] Deposit params:', {
      amount: price.value,
      txHash,
      account: {
        address: userFriendlyAddress.value,
      },
      clientId: authStore.user?.ton_address || 'unknown',
    });
    console.log('[DepositDialog] ClientId:', authStore.user?.ton_address || 'unknown');
    console.log('[DepositDialog] Transaction result:', result);

    await walletStore.deposit({
      amount: price.value,
      txHash,
      account: {
        address: userFriendlyAddress.value,
      },
      clientId: authStore.user?.ton_address || 'unknown',
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
  price.value = 1;
};
</script>
