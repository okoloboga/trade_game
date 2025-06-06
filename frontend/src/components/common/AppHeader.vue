<template>
  <v-app-bar color="#1a1a1a" flat dark>
    <v-container fluid>
      <v-row align="center" no-gutters>
        <!-- Кнопка Home слева -->
        <v-col cols="4">
          <v-btn to="/" text>
            <v-icon>mdi-home</v-icon>
            <v-tooltip activator="parent">{{ t('home') }}</v-tooltip>
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
          <v-btn text @click="handleLanguageChange">
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
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { TonConnectButton, useTonWallet } from '@townsquarelabs/ui-vue'
import { useLanguage } from '@/composables/useLanguage'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const DepositDialog = defineAsyncComponent(() => import('@/components/wallet/DepositDialog.vue'))
const WithdrawDialog = defineAsyncComponent(() => import('@/components/wallet/WithdrawDialog.vue'))

const { language, changeLanguage } = useLanguage()
const showDeposit = ref(false)
const showWithdraw = ref(false)

// Проверяем статус подключения кошелька через @townsquarelabs/ui-vue
const wallet = useTonWallet()
const isWalletConnected = ref(!!wallet.value)

// Локальные переменные для данных из сторов
const balance = ref(0)
const tokenBalance = ref(0)

onMounted(async () => {
  // Динамически импортируем сторы
  const { useAuthStore } = await import('@/stores/auth')
  const { useWalletStore } = await import('@/stores/wallet')
  const authStore = useAuthStore()
  const walletStore = useWalletStore()

  // Синхронизируем данные
  if (authStore.isConnected || wallet.value) {
    await walletStore.fetchWalletData()
    balance.value = walletStore.balance
    tokenBalance.value = walletStore.tokenBalance
  }
  // Синхронизируем authStore с wallet
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
  padding: 8px;
}
</style>
