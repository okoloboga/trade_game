```vue
<template>
  <v-container fluid class="wallet-container">
    <v-card v-if="authStore.isConnected && authStore.user" color="#1e1e1e" class="pa-4" elevation="4">
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <div class="text-body-1 text-white mb-2">
              {{ $t('ton_balance') }}: {{ walletStore.balance ? walletStore.balance.toFixed(3) : '0.000' }} TON
            </div>
            <div class="text-body-1 text-white mb-2">
              {{ $t('usdt_balance') }}: {{ walletStore.usdt_balance ?
              walletStore.usdt_balance.toFixed(3) : '0.000' }} USDT
            </div>
            <div class="text-body-1 text-white mb-2">
              {{ $t('ruble_balance') }}: {{ walletStore.tokenBalance ?
              walletStore.tokenBalance.toFixed(0) : '0' }} RUBLE
            </div>
          </v-col>
        </v-row>
        <div class="button-container">
          <v-btn
            color="success"
            class="mb-2"
            block
            :disabled="totalBalanceUsd >= 10"
            @click="openDepositDialog"
          >
            {{ $t('deposit') }}
          </v-btn>
          <v-row>
            <v-col cols="6">
              <v-btn color="primary" block @click="openWithdrawDialog">
                {{ $t('withdraw_ton') }}
              </v-btn>
            </v-col>
            <v-col cols="6">
              <v-btn color="primary" block @click="openWithdrawTokensDialog">
                {{ $t('withdraw_ruble') }}
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
      <DepositDialog v-model="showDepositDialog" @deposit-success="walletStore.fetchBalances" />
      <WithdrawDialog v-model="showWithdrawDialog" @withdraw-success="walletStore.fetchBalances" />
      <WithdrawTokensDialog v-model="showWithdrawTokensDialog" />
    </v-card>
    <v-card v-else color="#1e1e1e" class="pa-4" elevation="4">
      <v-card-text>
        <v-alert type="warning" variant="tonal">
          {{ $t('please_connect_wallet') }}
        </v-alert>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { useErrorStore } from '@/stores/error';
import { useMarketStore } from '@/stores/market';
import { formatAddress } from '@/utils/formatters';
import { useI18n } from 'vue-i18n';
import DepositDialog from '@/components/wallet/DepositDialog.vue';
import WithdrawDialog from '@/components/wallet/WithdrawDialog.vue';
import WithdrawTokensDialog from '@/components/wallet/WithdrawTokensDialog.vue';
import WalletIcon from '@/assets/wallet-icon.svg';

const { t } = useI18n();
const authStore = useAuthStore();
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const marketStore = useMarketStore();
const showDepositDialog = ref(false);
const showWithdrawDialog = ref(false);
const showWithdrawTokensDialog = ref(false);

const shortAddress = computed(() => formatAddress(authStore.walletAddress));

const totalBalanceUsd = computed(() => {
  const tonBalanceUsd = walletStore.balance * (marketStore.currentPrice ?? 3);
  const usdtBalance = walletStore.usdt_balance;
  const total = tonBalanceUsd + usdtBalance;
  return total;
});

/**
 * Opens the deposit dialog if the total balance is below the limit.
 */
const openDepositDialog = () => {
  if (totalBalanceUsd.value >= 10) {
    errorStore.setError(t('error.exceeds_max_balance'));
    return;
  }
  showDepositDialog.value = true;
};

/**
 * Opens the withdraw dialog.
 */
const openWithdrawDialog = () => {
  showWithdrawDialog.value = true;
};

/**
 * Opens the withdraw tokens dialog.
 */
const openWithdrawTokensDialog = () => {
  showWithdrawTokensDialog.value = true;
};

/**
 * Initializes the wallet view, syncing and fetching balances.
 */
onMounted(async () => {
  if (authStore.isConnected && authStore.user) {
    walletStore.syncFromAuthStore();
    try {
      await walletStore.fetchBalances();
    } catch (error) {
      console.error('[WalletView] Failed to fetch data:', error);
      errorStore.setError(t('error.failed_to_fetch_balances'));
    }
  } else {
    errorStore.setError(t('please_connect_wallet'));
  }
});

/**
 * Cleans up the wallet view.
 */
onUnmounted(() => {
});
</script>

<style scoped>
.wallet-container {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 4px;
}

.v-card {
  border-radius: 8px;
  overflow: hidden;
}

.v-btn {
  border-radius: 8px;
  text-transform: none;
}

.button-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wallet-info {
  display: flex;
  align-items: center;
}

.wallet-icon {
  width: 20px;
  height: 20px;
  filter: brightness(0) invert(1);
}
</style>
