<template>
  <v-app-bar color="black" dark>
    <v-row align="center" no-gutters>
      <v-col cols="4"><WalletConnect /></v-col>
      <v-col cols="4" class="text-center">
        <div v-if="authStore.isConnected" class="text-h6" style="font-size: 1rem">${{ walletStore.balance.toFixed(2) }}</div>
        <div v-if="authStore.isConnected" class="text-caption">{{ walletStore.tokenBalance }} RUBLE</div>
        <div v-else class="text-caption">Connect wallet</div>
      </v-col>
      <v-col cols="4" class="text-right">
        <v-btn icon @click="showDeposit = true">
          <v-icon>mdi-plus</v-icon>
          <v-tooltip activator="parent">Deposit</v-tooltip>
        </v-btn>
        <v-btn icon @click="showWithdraw = true">
          <v-icon>mdi-minus</v-icon>
          <v-tooltip activator="parent">Withdraw</v-tooltip>
        </v-btn>
        <v-btn icon @click="$router.push('/history')">
          <v-icon>mdi-history</v-icon>
          <v-tooltip activator="parent">History</v-tooltip>
        </v-btn>
      </v-col>
    </v-row>
    <DepositDialog v-model="showDeposit" />
    <WithdrawDialog v-model="showWithdraw" />
  </v-app-bar>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useWalletStore } from '@/stores/wallet'

const WalletConnect = defineAsyncComponent(() => import('@/components/wallet/WalletConnect.vue'))
const DepositDialog = defineAsyncComponent(() => import('@/components/wallet/DepositDialog.vue'))
const WithdrawDialog= defineAsyncComponent(() => import('@/components/wallet/WithdrawDialog.vue'))

const authStore = useAuthStore()
const walletStore = useWalletStore()
const showDeposit = ref(false)
const showWithdraw = ref(false)

onMounted(() => {
  if (authStore.isConnected) {
    walletStore.fetchWalletData()
  }
})

</script>
