<template>
  <v-app-bar color="#1a1a1a" flat dark>
    <v-container fluid>
      <v-row align="center" no-gutters>
        <!-- Home -->
        <v-col cols="2" class="text-center">
          <v-btn :to="'/'" variant="text" icon class="header-btn">
            <img :src="HomeIcon" class="icon home-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('home') }}</v-tooltip>
          </v-btn>
        </v-col>

        <!-- History -->
        <v-col cols="2" class="text-center">
          <v-btn :to="'/history'" variant="text" icon class="header-btn">
            <img :src="HistoryIcon" class="icon history-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('history') }}</v-tooltip>
          </v-btn>
        </v-col>

        <!-- Connect Wallet -->
        <v-col cols="4" class="text-center">
          <TonConnectButton v-if="!isWalletConnected" :style="{ display: 'inline-block' }" />
          <div v-if="isWalletConnected">
            <v-btn variant="text" icon @click="showWalletMenu = !showWalletMenu" class="header-btn">
              <v-icon color="#E0E0E0">mdi-link</v-icon>
              <v-tooltip activator="parent" location="bottom">{{ $t('wallet_connected') }}</v-tooltip>
            </v-btn>
          </div>
        </v-col>

        <!-- Wallet -->
        <v-col cols="2" class="text-center">
          <v-btn :to="'/wallet'" variant="text" icon class="header-btn">
            <img :src="WalletIcon" class="icon wallet-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('wallet') }}</v-tooltip>
          </v-btn>
        </v-col>

        <!-- Language -->
        <v-col cols="2" class="text-center">
          <v-btn variant="text" @click="handleLanguageChange" class="header-btn">
            {{ language === 'en' ? 'EN' : 'RU' }}
            <v-tooltip activator="parent" location="bottom">{{ $t('change_language') }}</v-tooltip>
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
    <DepositDialog v-model="showDeposit" />
    <WithdrawDialog v-model="showWithdraw" />
  </v-app-bar>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { ref, onMounted } from 'vue';
import { TonConnectButton, useTonWallet } from '@townsquarelabs/ui-vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import HomeIcon from '@/assets/home-icon.svg';
import HistoryIcon from '@/assets/history-icon.svg';
import WalletIcon from '@/assets/wallet-icon.svg';
import { useAuthStore } from '@/stores/auth';
import { useWalletStore } from '@/stores/wallet';
import { TonConnectService } from '@/services/tonConnect';

const { t } = useI18n();
const currentRoute = useRoute();
const { language, changeLanguage } = useLanguage();
const showDeposit = ref(false);
const showWithdraw = ref(false);
const showWalletMenu = ref(false);

const wallet = useTonWallet();
const authStore = useAuthStore();
const walletStore = useWalletStore();
const isWalletConnected = ref(!!wallet.value);
const tonConnectService = new TonConnectService();

onMounted(async () => {
  console.log('AppHeader mounted, wallet:', !!wallet.value);
  if (wallet.value) {
    try {
      await tonConnectService.handleWalletConnect(wallet.value);
      isWalletConnected.value = true;
      await walletStore.fetchWalletData();
      balance.value = walletStore.balance;
      tokenBalance.value = walletStore.tokenBalance;
    } catch (error) {
      console.error('Failed to handle wallet on mount:', error);
    }
  }
  authStore.setConnected(!!wallet.value);
});

const balance = ref(0);
const tokenBalance = ref(0);

const handleLanguageChange = () => {
  const newLanguage = language.value === 'en' ? 'ru' : 'en';
  changeLanguage(newLanguage);
};
</script>

<style scoped>
/* Базовые стили */
.v-app-bar {
  height: 62px !important;
  padding: 0px 8px 4px 4px;
}

/* Стили для иконок */
.icon {
  width: 24px;
  height: 24px;
  filter: brightness(0) invert(1);
  transition: opacity 0.2s ease;
}

/* Состояние наведения */
.v-btn.header-btn:hover .icon {
  opacity: 0.8;
}

/* Активное состояние (нажатие) - только для Home */
.v-btn.header-btn:active .home-icon {
  background: rgba(255, 255, 255, 0.1) !important;
  border-radius: 50%;
  padding: 8px;
}

/* Фикс для Material иконки */
.header-btn :deep(.v-icon) {
  color: inherit !important;
}

/* Специфичные стили для TonConnectButton */
.ton-connect-button {
  padding-bottom: 4px;
  --tc-button-background: transparent !important;
  --tc-button-color: #E0E0E0 !important;
}
</style>
