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
import { useTonWallet, useTonConnectUI, useTonAddress } from '@townsquarelabs/ui-vue';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue']);
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const { tonConnectUI } = useTonConnectUI();
const wallet = useTonWallet();
const userFriendlyAddress = useTonAddress(true); // User-friendly адрес
const price = ref(0.01);
const isProcessing = ref(false);

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
  if (!wallet || !userFriendlyAddress.value || !tonConnectUI.connected) {
    console.error('[DepositDialog] Wallet not connected:', { wallet, userFriendlyAddress: userFriendlyAddress.value, connected: tonConnectUI.connected });
    errorStore.setError(t('error.connect_wallet'));
    try {
      console.log('[DepositDialog] Attempting to reconnect wallet');
      await tonConnectUI.connectWallet();
    } catch (connectError) {
      console.error('[DepositDialog] Wallet reconnect failed:', connectError);
      errorStore.setError(t('error.failed_to_connect_wallet'));
    }
    return;
  }

  isProcessing.value = true;
  try {
    // Конвертация TON в нанотоны (1 TON = 1,000,000,000 нанотонов)
    const nanoAmount = Math.floor(price.value * 1_000_000_000).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60, // 60 секунд
      network: '-239', // Mainnet
      messages: [
        {
          address: import.meta.env.VITE_TON_CENTRAL_WALLET, // User-friendly адрес
          amount: nanoAmount,
          stateInit: wallet.account?.walletStateInit || null, // Добавляем для совместимости с @Wallet
        },
      ],
    };

    console.log('[DepositDialog] User-friendly address:', userFriendlyAddress.value);
    console.log('[DepositDialog] Wallet account:', wallet.account);
    console.log('[DepositDialog] TonConnectUI connected:', tonConnectUI.connected);
    console.log('[DepositDialog] Sending transaction:', transaction);

    // Отправка транзакции через TonConnect
    const result = await tonConnectUI.sendTransaction(transaction);
    console.log('[DepositDialog] Transaction result:', result);
    const txHash = result.boc; // Используем boc как txHash

    // Вызов deposit с txHash и дополнительными параметрами
    await walletStore.deposit({
      amount: price.value, // В TON для бэкенда
      txHash,
      tonProof: wallet.connectItems?.tonProof?.proof || null,
      account: {
        address: userFriendlyAddress.value,
        publicKey: wallet.account?.publicKey || '',
        chain: wallet.account?.chain || '-239',
        walletStateInit: wallet.account?.walletStateInit || '',
      },
      clientId: wallet.device?.appName || 'unknown',
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
