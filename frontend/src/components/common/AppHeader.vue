<template>
  <v-app-bar color="#1a1a1a" flat dark>
    <v-container fluid>
      <v-row align="center" no-gutters>
        <!-- Кнопка Home/History слева -->
        <v-col cols="4">
          <v-btn :to="currentRoute.name === 'main' ? '/history' : '/'" variant="text">
            <v-icon left>mdi-home</v-icon>
            {{ currentRoute.name === 'main' ? t('history') : t('home') }}
          </v-btn>
        </v-col>

        <!-- Кошелёк по центру -->
        <v-col cols="4" class="text-center">
          <TonConnectButton v-if="!isWalletConnected" :style="{ display: 'inline-block' }" />
          <div v-if="isWalletConnected">
            <div class="text-h6" style="font-size: 1rem">${{ balance ? balance.toFixed(2) : '0.00' }}</div>
            <div class="text-caption">{{ tokenBalance }} RUBLE</div>
          </div>
        </v-col>

        <!-- Смена языка справа -->
        <v-col cols="4" class="text-right">
          <v-btn variant="text" @click="handleLanguageChange">
            {{ language === 'en' ? 'EN' : 'RU' }}
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
    <DepositDialog v-model="showDeposit" />
    <WithdrawDialog v-model="showWithdraw" />
  </v-app-bar>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { TonConnectButton, useTonWallet } from '@townsquarelabs/ui-vue'
import { useLanguage } from '@/composables/useLanguage'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const DepositDialog = defineAsyncComponent(() => import('@/components/wallet/DepositDialog.vue'))
const WithdrawDialog = defineAsyncComponent(() => import('@/components/wallet/WithdrawDialog.vue'))
const currentRoute = useRoute()
const { language, changeLanguage } = useLanguage()
const showDeposit = ref(false)
const showWithdraw = ref(false)

const wallet = useTonWallet()
const isWalletConnected = ref(!!wallet.value)

const balance = ref(0)
const tokenBalance = ref(0)

onMounted(async () => {
  const { useAuthStore } = await import('@/stores/auth')
  const { useWalletStore } = await import('@/stores/wallet')
  const authStore = useAuthStore()
  const walletStore = useWalletStore()

  if (authStore.isConnected || wallet.value) {
    await walletStore.fetchWalletData()
    balance.value = walletStore.balance
    tokenBalance.value = walletStore.tokenBalance
  }
  wallet.value ? authStore.setConnected(true) : authStore.setConnected(false)
})

const handleLanguageChange = () => {
  const newLanguage = language.value === 'en' ? 'ru' : 'en'
  changeLanguage(newLanguage)
}
</script>

<style scoped>
.v-app-bar {
  height: 60px !important;
  padding: 0px 8px 12px 8px; /* Добавлен больший отступ снизу */
  display: flex;
  align-items: center;
}

.v-btn {
  padding-bottom: 4px; /* Отступ снизу для кнопок Home и RU/EN */
}

.ton-connect-button {
  padding-bottom: 8px; /* Отступ снизу для TonConnectButton */
}
</style>
