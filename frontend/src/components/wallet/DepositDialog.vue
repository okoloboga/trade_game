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
import { useMarketStore } from '@/stores/market';
import { useErrorStore } from '@/stores/error';
import { useDebounceFn } from '@vueuse/core';
import { validateAmount } from '@/utils/validators';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';
import { useTonConnectUI } from '@townsquarelabs/ui-vue';
import { Buffer } from 'buffer';
import { beginCell } from '@ton/core';
import apiService from '@/services/api';

const { t } = useI18n();
const props = defineProps({
  modelValue: { type: Boolean, required: true },
});
const emit = defineEmits(['update:modelValue', 'deposit-success']);
const walletStore = useWalletStore();
const marketStore = useMarketStore();
const errorStore = useErrorStore();
const authStore = useAuthStore();
const [tonConnectUI] = useTonConnectUI();
const price = ref(0.01);
const isProcessing = ref(false);

const currentPrice = computed(() => {
  const price = marketStore.currentPrice ?? 3; // Fallback to 3 USD/TON
  return price;
});

const totalBalanceUsd = computed(() => {
  const tonBalanceUsd = walletStore.balance * currentPrice.value;
  const usdtBalance = walletStore.usdt_balance;
  const total = tonBalanceUsd + usdtBalance;
  return total;
});

const depositRules = computed(() => [
  (v) => validateAmount(v, Infinity, 0.01) === true || t('error.invalid_amount'),
  (v) => {
    const priceInUsd = v * currentPrice.value;
    const newTotalBalance = totalBalanceUsd.value + priceInUsd;
    return newTotalBalance <= 10 || t('error.exceeds_max_balance');
  },
]);

const isValid = computed(() => {
  const amountValid = validateAmount(price.value, Infinity, 0.01) === true;
  const priceInUsd = price.value * currentPrice.value;
  const newTotalBalance = totalBalanceUsd.value + priceInUsd;
  const balanceValid = newTotalBalance <= 10;
  return amountValid && balanceValid;
});

/**
 * Initiates a deposit transaction to the smart contract.
 */
const deposit = useDebounceFn(async () => {
  if (!tonConnectUI.connected) {
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

  const contractAddress = import.meta.env.VITE_WALLET_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error('[DepositDialog] Wallet contract address not configured');
    errorStore.setError(t('error.no_contract_address'));
    return;
  }

  isProcessing.value = true;
  try {
    // Prepare Deposit message (opcode 0x01 = 1)
    // Deposit message format: uint32 opcode (1) = 32 bits
    const depositBody = beginCell()
      .storeUint(1, 32) // opcode 1 for Deposit message
      .endCell();
    
    // Convert to BOC (Bag of Cells) base64 string
    const depositBoc = depositBody.toBoc({ idx: false, crc32: true }).toString('base64');
    
    const nanoAmount = Math.floor(price.value * 1_000_000_000).toString();
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: contractAddress,
          amount: nanoAmount,
          payload: depositBoc,
        },
      ],
    };

    const result = await tonConnectUI.sendTransaction(transaction);
    const txHash = result.boc;

    const response = await apiService.deposit({
      tonAddress: authStore.user.ton_address,
      amount: price.value,
      txHash,
    });

    await walletStore.fetchBalances();
    emit('deposit-success');
    closeDialog();
  } catch (error) {
    console.error('[DepositDialog] Deposit error:', error);
    errorStore.setError(t('error.failed_to_initiate_deposit'));
  } finally {
    isProcessing.value = false;
  }
}, 300);

/**
 * Closes the deposit dialog and resets the input amount.
 */
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
