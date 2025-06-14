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
        <div class="button-container">
          <v-btn
            color="success"
            class="mb-2"
            block
            @click="openDepositDialog"
          >
            {{ $t('deposit') }}
          </v-btn>
          <v-btn
            color="warning"
            class="mb-2"
            block
            @click="openTestDialog"
          >
            {{ $t('test_dialog') }}
          </v-btn>
        </div>
      </v-card-text>
      <DepositDialog v-model="showDepositDialog" />
      <v-dialog v-model="showTestDialog" max-width="320">
        <v-card>
          <v-card-title>Test Dialog</v-card-title>
          <v-card-text>This is a test dialog.</v-card-text>
          <v-btn @click="showTestDialog = false">Close</v-btn>
        </v-card>
      </v-dialog>
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

import WalletIcon from '@/assets/wallet-icon.svg';

console.log('[WalletView] Importing DepositDialog:', DepositDialog);


const { t } = useI18n();
const authStore = useAuthStore();
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const showDepositDialog = ref(false);

const showTestDialog = ref(false);

const shortAddress = computed(() => formatAddress(authStore.walletAddress));

const openDepositDialog = () => {
  console.log('[WalletView] Current showDepositDialog:', showDepositDialog.value);
  showDepositDialog.value = true;
  console.log('[WalletView] New showDepositDialog:', showDepositDialog.value);
};

const openTestDialog = (event) => {
  console.log('[WalletView] Opening TestDialog, event:', event);
  showTestDialog.value = true;
};

watch(showDepositDialog, (newValue) => {
  console.log('[WalletView] showDepositDialog changed:', newValue);
});

watch(showTestDialog, (newValue) => {
  console.log('[WalletView] showTestDialog changed:', newValue);
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
