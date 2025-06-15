<template>
  <v-container fluid class="wallet-container">
    <v-card v-if="authStore.isConnected && authStore.user" color="#1e1e1e" class="pa-4" elevation="4">
      <v-card-text>
        <div class="wallet-info mb-4">
          <v-chip color="success" size="small">
            {{ shortAddress }}&nbsp;
            <img :src="WalletIcon" class="icon wallet-icon" />
          </v-chip>
        </div>
        <div class="mb-2">
          <strong>{{ $t('ton_balance') }}: {{ walletStore.balance.toFixed(2) }}</strong>
        </div>
        <div class="mb-4">
          <strong>{{ $t('ruble_balance') }}: {{ walletStore.tokenBalance.toFixed(2) }}</strong>
        </div>
        <!-- Первый ряд: Deposit -->
        <v-row>
          <v-col cols="12">
            <v-btn
              color="success"
              class="full-width"
              @click="showDepositDialog = true"
            >
              {{ $t('deposit') }}
            </v-btn>
          </v-col>
        </v-row>
        <!-- Второй ряд: Withdraw TON и Withdraw RUBLE -->
        <v-row class="mt-2">
          <v-col cols="6">
            <v-btn
              color="primary"
              class="full-width"
              @click="showWithdrawDialog = true"
            >
              {{ $t('withdraw_ton') }}
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              color="primary"
              class="full-width"
              @click="showWithdrawTokensDialog = true"
            >
              {{ $t('withdraw_ruble') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <DepositDialog v-model="showDepositDialog" />
      <WithdrawDialog v-model="showWithdrawDialog" />
      <WithdrawTokensDialog v-model="showWithdrawTokensDialog" />
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import { formatAddress } from '@/utils/formatters'
import { useI18n } from 'vue-i18n'
import DepositDialog from '@/components/wallet/DepositDialog.vue'
import WithdrawDialog from '@/components/wallet/WithdrawDialog.vue'
import WithdrawTokensDialog from '@/components/wallet/WithdrawTokensDialog.vue'
import WalletIcon from '@/assets/wallet-icon.svg'

const { t } = useI18n()
const authStore = useAuthStore()
const walletStore = useWalletStore()
const errorStore = useErrorStore()
const showDepositDialog = ref(false)
const showWithdrawDialog = ref(false)
const showWithdrawTokensDialog = ref(false)

const shortAddress = computed(() => formatAddress(authStore.walletAddress))

const openDepositDialog = () => {
  console.log('[WalletView] Opening DepositDialog, showDepositDialog:', showDepositDialog.value);
  showDepositDialog.value = true;
};

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

.full-width {
  width: 100% !important;
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
