<template>
  <div class="wallet-info">
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
          <v-card-actions>
            <v-spacer />
            <v-btn color="red" size="small" @click="disconnectWallet">{{ $t('disconnect') }}</v-btn>
          </v-card-actions>
        </v-card-text>
      </v-card>
    </v-menu>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'
import { useErrorStore } from '@/stores/error'
import { formatAddress } from '@/utils/formatters'
import { TonConnectService } from '@/services/tonConnect'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const walletStore = useWalletStore()
const errorStore = useErrorStore()
const showWalletMenu = ref(false)
const tonConnectService = new TonConnectService()

const shortAddress = computed(() => formatAddress(authStore.walletAddress))

const disconnectWallet = async () => {
  try {
    await tonConnectService.disconnect()
    authStore.logout()
    walletStore.$reset()
    errorStore.setError(t('wallet_disconnected'), false)
  } catch (error) {
    errorStore.setError(t('failed_to_disconnect_wallet'))
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
