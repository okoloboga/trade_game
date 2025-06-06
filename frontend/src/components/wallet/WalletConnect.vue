<template>
  <div>
    <v-btn
      v-if="!authStore.isConnected"
      color="primary"
      @click="connectWallet"
      :loading="isConnecting"
    >
    </v-btn>
    <div v-else class="wallet-info">
      <v-chip
        color="success"
        size="small"
        @click="showWalletMenu = !showWalletMenu"
        clickable
      >
        {{ shortAddress }}
        <v-icon small class="ml-1">mdi-wallet</v-icon>
      </v-chip>
      <v-menu v-model="showWalletMenu" :close-on-content-click="false" location="bottom">
        <v-card color="black" min-width="300">
          <v-card-text>
            <div class="mb-2">
              <strong>{{ $t('ton_balance') }}:</strong> {{ walletStore.balance.toFixed(2) }} TON
            </div>
            <div class="mb-2">
              <strong>{{ $t('ruble_balance') }}:</strong> {{ walletStore.tokenBalance.toFixed(2) }} RUBLE
            </div>
            <v-btn
              color="primary"
              size="small"
              class="mr-2"
              @click="showWithdrawDialog = true"
            >
             {{ $t('withdraw_ton') }}
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              @click="showWithdrawTokensDialog = true"
            >
              {{ $t('withdraw_ruble') }}
            </v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
              <v-btn color="red" size="small" @click="disconnectWallet">{{ $t('disconnect') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>
      <WithdrawDialog v-model="showWithdrawDialog" />
      <WithdrawTokensDialog v-model="showWithdrawTokensDialog" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import { formatAddress } from '@/utils/formatters'
import { TonConnectService } from '@/services/tonConnect'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const WithdrawDialog = defineAsyncComponent(() => import('./WithdrawDialog.vue'))
const WithdrawTokensDialog = defineAsyncComponent(() => import('./WithdrawTokensDialog.vue'))

const authStore = useAuthStore()
const walletStore = useWalletStore()
const errorStore = useErrorStore()
const isConnecting = ref(false)
const showWalletMenu = ref(false)
const showWithdrawDialog = ref(false)
const showWithdrawTokensDialog = ref(false)
const tonConnectService = new TonConnectService()

const shortAddress = computed(() => formatAddress(authStore.walletAddress))

const connectWallet = async () => {
  isConnecting.value = true
  try {
    const wallet = await tonConnectService.connect()
    const challenge = await authStore.generateChallenge(wallet.account.address)
    const proof = await tonConnectService.signData({
      data: challenge.data,
      validUntil: challenge.validUntil,
      network: challenge.network,
      from: wallet.account.address,
    })
    await authStore.verifyProof(proof)
    await authStore.login(wallet.account.address)
    await walletStore.fetchWalletData()
    errorStore.setError('Wallet connected successfully', false)
  } catch (error) {
    errorStore.setError('Failed to connect wallet')
  } finally {
    isConnecting.value = false
  }
}

const disconnectWallet = async () => {
  try {
    await tonConnectService.disconnect()
    authStore.logout()
    walletStore.$reset()
    errorStore.setError('Wallet disconnected', false)
  } catch (error) {
    errorStore.setError('Failed to disconnect wallet')
  }
}

onMounted(() => {
  if (authStore.isConnected) {
    walletStore.fetchWalletData()
  }
})
</script>

<style scoped>
.wallet-info {
  display: flex;
  align-items: center;
}
</style>
