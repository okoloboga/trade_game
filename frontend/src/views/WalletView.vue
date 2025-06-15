```vue
<template>
  <v-container fluid class="wallet-container">
    <v-card v-if="authStore.isConnected && authStore.user" color="#1e1e1e" class="pa-4" elevation="4">
      <v-card-text>
        <div class="wallet-info mb-4">
          <v-chip color="success" size="small">
            {{ shortAddress }}
            <img :src="WalletIcon" class="icon wallet-icon" />
          </v-chip>
        </div>
        <div class="mb-2">
          <strong>{{ $t('ton_balance') }}: {{ walletStore.balance.toFixed(2) }}</strong>
        </div>
        <div class="mb-4">
          <strong>{{ $t('ruble_balance') }}: {{ walletStore.tokenBalance.toFixed(2) }}</strong>
        </div>
        <!-- Кнопки без v-row/v-col -->
        <div class="button-container">
          <v-btn
            color="success"
            class="mb-2"
            block
            @click="openDepositDialog"
            @touchstart="handleTouchStart"
          >
            {{ $t('deposit') }}
          </v-btn>
          <v-btn
            color="primary"
            class="mb-2"
            block
            @click="openWithdrawDialog"
            @touchstart="handleTouchStart"
          >
            {{ $t('withdraw_ton') }}
          </v-btn>
          <v-btn
            color="primary"
            block
            @click="openWithdrawTokensDialog"
            @touchstart="handleTouchStart"
          >
            {{ $t('withdraw_ruble') }}
          </v-btn>
        </div>
      </v-card-text>
      <DepositDialog v-model="showDepositDialog" />
      <WithdrawDialog v-model="showWithdrawDialog" />
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
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { useErrorStore } from '@/stores/error';
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
const showDepositDialog = ref(false);
const showWithdrawDialog = ref(false);
const showWithdrawTokensDialog = ref(false);

const shortAddress = computed(() => formatAddress(authStore.walletAddress));

const openDepositDialog = (event) => {
  console.log('[WalletView] Opening DepositDialog, event:', event);
  showDepositDialog.value = true;
};

const openWithdrawDialog = (event) => {
  console.log('[WalletView] Opening WithdrawDialog, event:', event);
  showWithdrawDialog.value = true;
};

const openWithdrawTokensDialog = (event) => {
  console.log('[WalletView] Opening WithdrawTokensDialog, event:', event);
  showWithdrawTokensDialog.value = true;
};

const handleTouchStart = (event) => {
  console.log('[WalletView] Touch event detected:', event);
};

watch(showDepositDialog, (newValue) => {
  console.log('[WalletView] showDepositDialog changed:', newValue);
});

watch(showWithdrawDialog, (newValue) => {
  console.log('[WalletView] showWithdrawDialog changed:', newValue);
});

watch(showWithdrawTokensDialog, (newValue) => {
  console.log('[WalletView] showWithdrawTokensDialog changed:', newValue);
});

onMounted(async () => {
  if (authStore.isConnected && authStore.user) {
    walletStore.syncFromAuthStore();
    try {
      await walletStore.fetchTonPrice();
    } catch (error) {
      errorStore.setError(t('failed_to_fetch_ton_price'));
    }
  } else {
    errorStore.setError(t('please_connect_wallet'));
  }
});
</script>

<style scoped>
.wallet-container {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
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
