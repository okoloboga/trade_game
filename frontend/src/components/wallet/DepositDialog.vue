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

    console.log('[DepositDialog] User-friendly address:', userFriendlyAddress.value);
    console.log('[DepositDialog] Wallet:', wallet);
    console.log('[DepositDialog] TonConnectUI wallet:', tonConnectUI.wallet);
    console.log('[DepositDialog] UniversalLink:', tonConnectUI.wallet?.universalLink);
    console.log('[DepositDialog] Connection restored:', connectionRestored);
    console.log('[DepositDialog] Sending transaction:', transaction.value);

    console.log('[DepositDialog] Opening modal for transaction confirmation');
    await openModal(); // Используем openModal из useTonConnectModal

    // Пробуем с await, но учитываем, что в 2.0.9 результат может отличаться
    let result;
    try {
      result = await tonConnectUI.sendTransaction(transaction.value);
    } catch (sendError) {
      console.error('[DepositDialog] Send transaction failed:', sendError);
      throw sendError;
    }
    console.log('[DepositDialog] Transaction result:', result);

    // В 2.0.9 результат может не содержать boc, проверяем
    const txHash = result?.boc || result?.transactionHash || 'unknown';

    await walletStore.deposit({
      amount: price.value,
      txHash,
      tonProof: wallet?.connectItems?.tonProof?.proof || null,
      account: {
        address: userFriendlyAddress.value,
        publicKey: tonConnectUI.wallet?.account?.publicKey || '',
        chain: tonConnectUI.wallet?.account?.chain || '-239',
        walletStateInit: tonConnectUI.wallet?.account?.walletStateInit || '',
      },
      clientId: wallet?.device?.appName || 'unknown',
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
  price.value = 0.01;
};
</script>
