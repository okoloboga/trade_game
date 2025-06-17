<template>
  <v-app-bar color="#1a1a1a" flat dark>
    <v-container fluid>
      <v-row align="center" no-gutters>
        <v-col cols="2" class="text-center">
          <v-btn :to="'/'" variant="text" icon class="header-btn">
            <img :src="HomeIcon" class="icon home-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('home') }}</v-tooltip>
          </v-btn>
        </v-col>
        <v-col cols="2" class="text-center">
          <v-btn :to="'/history'" variant="text" icon class="header-btn">
            <img :src="HistoryIcon" class="icon history-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('history') }}</v-tooltip>
          </v-btn>
        </v-col>
        <v-col cols="4" class="text-center">
          <div class="m-btn">
            <TonConnectButton :button-root-id="'ton-connect-button'" />
          </div>
        </v-col>
        <v-col cols="2" class="text-center">
          <v-btn :to="'/wallet'" variant="text" icon class="header-btn">
            <img :src="WalletIcon" class="icon wallet-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('wallet') }}</v-tooltip>
          </v-btn>
        </v-col>
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
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useTonWallet, useTonConnectUI, TonConnectButton, useTonAddress } from '@townsquarelabs/ui-vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import HomeIcon from '@/assets/home-icon.svg';
import HistoryIcon from '@/assets/history-icon.svg';
import WalletIcon from '@/assets/home-icon.svg';

const { t } = useI18n();
const { language, changeLanguage } = useLanguage();

const wallet = useTonWallet();
const [tonConnectUI, setOptions] = useTonConnectUI(); // Используем массив, как в DepositDialog.vue
const walletAddress = ref(null);
const clientId = ref(null);
const userFriendlyAddress = useTonAddress(true);
const rawAddress = useTonAddress(false);

let authStore, walletStore;

const recreateProofPayload = async () => {
  console.log('[recreateProofPayload] Generating challenge');
  try {
    console.log('[recreateProofPayload] tonConnectUI:', tonConnectUI);
    tonConnectUI.setConnectRequestParameters({ state: 'loading' });
    console.log('[recreateProofPayload] Requesting challenge from backend with clientId:', clientId.value || 'none');
    const payload = await authStore.generateChallenge(clientId.value);
    console.log('[recreateProofPayload] Received payload:', JSON.stringify(payload, null, 2));
    if (payload?.challenge && payload?.clientId) {
      clientId.value = payload.clientId;
      console.log('[recreateProofPayload] Setting connect parameters to ready with challenge:', payload.challenge);
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: payload.challenge },
      });
      return true;
    } else {
      console.warn('[recreateProofPayload] No valid challenge or clientId received, resetting parameters');
      tonConnectUI.setConnectRequestParameters(null);
      return false;
    }
  } catch (error) {
    console.error('[recreateProofPayload] Failed to generate tonProof payload:', error);
    tonConnectUI.setConnectRequestParameters(null);
    return false;
  }
};

const handleWalletConnect = async (walletData) => {
  try {
    if (!walletData?.connectItems?.tonProof || !('proof' in walletData.connectItems.tonProof)) {
      console.warn('[handleWalletConnect] No tonProof available, proceeding without tonProof verification');
    }

    const walletAddressFriendly = userFriendlyAddress.value;
    if (!walletAddressFriendly) {
      throw new Error('[handleWalletConnect] User-friendly address not available');
    }
    const tonProofPayload = walletData.connectItems.tonProof.proof;
    const tonProof = { proof: tonProofPayload };
    const account = {
      address: walletAddressFriendly,
      publicKey: walletData.account.publicKey,
      chain: walletData.account.chain,
      walletStateInit: walletData.account.walletStateInit || '',
    };
    console.log('[handleWalletConnect] Logging in with address:', walletAddressFriendly);
    await authStore.login({
      ton_address: walletAddressFriendly,
      tonProof,
      account,
      clientId: clientId.value,
    });
    walletAddress.value = walletAddressFriendly;
    authStore.setConnected(true);
    walletStore.syncFromAuthStore();
    console.log('[handleWalletConnect] Wallet connected and authorized successfully');
  } catch (error) {
    console.error('[handleWalletConnect] Authorization failed:', error);
    authStore.logout();
    walletAddress.value = null;
    clientId.value = null;
    throw error;
  }
};

onMounted(async () => {
  console.log('[onMounted] Initializing AppHeader');
  const { useAuthStore } = await import('@/stores/auth');
  const { useWalletStore } = await import('@/stores/wallet');
  authStore = useAuthStore();
  walletStore = useWalletStore();

  console.log('[onMounted] Initializing auth store');
  await authStore.init();

  // Проверяем состояние подключения
  if (tonConnectUI.connected && wallet.value) {
    console.log('[onMounted] Wallet already connected, waiting for address');
    // Ждём, пока адрес станет доступен
    await new Promise((resolve) => {
      const unwatch = watch(userFriendlyAddress, (newAddress) => {
        if (newAddress) {
          unwatch();
          resolve();
        }
      });
    });
    console.log('[onMounted] Address available:', userFriendlyAddress.value);
    walletAddress.value = userFriendlyAddress.value;
    const success = await recreateProofPayload();
    if (success) {
      await handleWalletConnect(wallet.value);
      console.log('[onMounted] Wallet synced successfully');
    } else {
      console.warn('[onMounted] Failed to generate tonProof, disconnecting');
      await tonConnectUI.disconnect();
      authStore.logout();
    }
  } else {
    console.log('[onMounted] No wallet connected, generating initial challenge');
    await recreateProofPayload();
  }

  console.log('[onMounted] Setting up wallet status change listener');
  tonConnectUI.onStatusChange(async (walletData) => {
    if (walletData) {
      console.log('[onStatusChange] Wallet data received:', walletData);
      // Ждём адрес, если он ещё не готов
      if (!userFriendlyAddress.value) {
        console.log('[onStatusChange] Waiting for user-friendly address');
        await new Promise((resolve) => {
          const unwatch = watch(userFriendlyAddress, (newAddress) => {
            if (newAddress) {
              unwatch();
              resolve();
            }
          });
        });
      }
      console.log('[onStatusChange] Wallet connected, address:', userFriendlyAddress.value);
      await handleWalletConnect(walletData);
    } else {
      console.log('[onStatusChange] Wallet disconnected');
      authStore.logout();
      walletAddress.value = null;
      clientId.value = null;
      console.log('[onStatusChange] Resetting connect parameters');
      tonConnectUI.setConnectRequestParameters(null);
    }
  });
});

onUnmounted(() => {
  console.log('[onUnmounted] Cleaning up AppHeader');
});

const handleLanguageChange = () => {
  console.log('[handleLanguageChange] Changing language from', language.value, 'to', language.value === 'en' ? 'ru' : 'en');
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
