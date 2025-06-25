<template>
  <v-app-bar color="#1a1a1a" flat dark>
    <v-container fluid>
      <v-row align="center">
        <v-col cols="2" class="text-center">
          <v-btn :to="'/'" variant="text" icon class="header-btn home-btn">
            <img :src="HomeIcon" class="icon home-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('home') }}</v-tooltip>
          </v-btn>
        </v-col>
        <v-col cols="2" class="text-center">
          <v-btn :to="'/history'" variant="text" icon class="header-btn history-btn">
            <img :src="HistoryIcon" class="icon history-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('history') }}</v-tooltip>
          </v-btn>
        </v-col>
        <v-col cols="4" class="text-center">
          <div class="m-btn">
            <TonConnectButton class="custom-ton-connect-button" :button-root-id="'ton-connect-button'" />
          </div>
        </v-col>
        <v-col cols="2" class="text-center">
          <v-btn :to="'/wallet'" variant="text" icon class="header-btn wallet-btn">
            <img :src="WalletIcon" class="icon wallet-icon" />
            <v-tooltip activator="parent" location="bottom">{{ $t('wallet') }}</v-tooltip>
          </v-btn>
        </v-col>
        <v-col cols="2" class="text-center">
          <v-btn variant="text" @click="handleLanguageChange" class="header-btn language-btn">
            {{ language === 'en' ? 'EN' : 'RU' }}
            <v-tooltip activator="parent" location="bottom">{{ $t('change_language') }}</v-tooltip>
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-app-bar>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useTonWallet, useTonConnectUI, TonConnectButton, useTonAddress } from '@townsquarelabs/ui-vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import HomeIcon from '@/assets/home-icon.svg';
import HistoryIcon from '@/assets/history-icon.svg';
import WalletIcon from '@/assets/wallet-icon.svg';

const { t } = useI18n();
const { language, changeLanguage } = useLanguage();

const wallet = useTonWallet();
const [tonConnectUI] = useTonConnectUI();
const walletAddress = ref(null);
const clientId = ref(null);
const userFriendlyAddress = useTonAddress(true);

let authStore, walletStore;

const recreateProofPayload = async () => {
  console.log('[recreateProofPayload] Generating challenge');
  try {
    tonConnectUI.setConnectRequestParameters({ state: 'loading' });
    const payload = await authStore.generateChallenge(userFriendlyAddress.value || 'unknown');
    console.log('[recreateProofPayload] Received payload:', JSON.stringify(payload, null, 2));
    if (payload?.challenge && payload?.clientId) {
      clientId.value = payload.clientId;
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: payload.challenge },
      });
      return true;
    } else {
      console.warn('[recreateProofPayload] No valid challenge or clientId');
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
    const walletAddressFriendly = userFriendlyAddress.value;
    if (!walletAddressFriendly) {
      throw new Error('[handleWalletConnect] User-friendly address not available');
    }
    const tonProofPayload = walletData.connectItems?.tonProof?.proof;
    const tonProof = tonProofPayload ? { proof: tonProofPayload } : null;
    const account = {
      address: walletAddressFriendly,
      publicKey: walletData.account?.publicKey || '',
      chain: walletData.account?.chain || '',
      walletStateInit: walletData.account?.walletStateInit || '',
    };
    console.log('[handleWalletConnect] Logging in with ton_address:', walletAddressFriendly);
    await authStore.login({
      ton_address: walletAddressFriendly,
      tonProof,
      account,
      clientId: clientId.value || walletAddressFriendly,
    });
    authStore.setTonProof(tonProof?.proof || null);
    walletAddress.value = walletAddressFriendly;
    authStore.setConnected(true);
    walletStore.syncFromAuthStore();
    console.log('[handleWalletConnect] Wallet connected and authorized');
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
  console.log('[onMounted] authStore after init:', authStore.token, authStore.user);

  if (tonConnectUI.connected && wallet.value) {
    console.log('[onMounted] Wallet already connected');
    await new Promise((resolve) => {
      const unwatch = watch(userFriendlyAddress, (newAddress) => {
        if (newAddress) {
          unwatch();
          resolve();
        }
      });
    });
    walletAddress.value = userFriendlyAddress.value;
    const success = await recreateProofPayload();
    if (success) {
      await handleWalletConnect(wallet.value);
    } else {
      console.warn('[onMounted] Failed to generate tonProof, disconnecting');
      await tonConnectUI.disconnect();
      authStore.logout();
    }
  } else {
    console.log('[onMounted] No wallet connected, generating challenge');
    await recreateProofPayload();
  }

  tonConnectUI.onStatusChange(async (walletData) => {
    if (walletData) {
      console.log('[onStatusChange] Wallet data received:', walletData, 'connected:',
      tonConnectUI.connected, 'token:', authStore.token);
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
      console.log('[onStatusChange] Wallet disconnected, token before logout:', authStore.token);
      authStore.logout();
      walletAddress.value = null;
      clientId.value = null;
      tonConnectUI.setConnectRequestParameters(null);
    }
  });
});

onUnmounted(() => {
  console.log('[onUnmounted] Cleaning up AppHeader');
});

const handleLanguageChange = () => {
  console.log('[handleLanguageChange] Changing language:', language.value);
  const newLanguage = language.value === 'en' ? 'ru' : 'en';
  changeLanguage(newLanguage);
};
</script>

<style scoped>
/* Базовые стили */
.v-app-bar {
  height: 62px !important;
  padding: 0px 4px 4px 4px;
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

/* Кастомные стили для TonConnectButton */
.custom-ton-connect-button {
  max-width: 150px;
  width: 100%;
}

/* Стили для контейнера кнопки */
.m-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 150px;
  margin: 0 auto;
}

/* Смещение кнопок */
.home-btn {
  margin-right: 8px; /* Смещаем Home левее, добавляем пространство справа */
}
.history-btn {
  margin-right: 16px; /* Смещаем History левее, больше пространства справа */
}
.wallet-btn {
  margin-left: 16px; /* Смещаем Wallet правее, больше пространства слева */
}
.language-btn {
  margin-left: 8px; /* Смещаем RU/EN правее, добавляем пространство слева */
}

/* Адаптивность */
@media (max-width: 600px) {
  .custom-ton-connect-button,
  .m-btn {
    max-width: 120px; /* Уменьшаем кнопку на мобильных */
  }
  .home-btn,
  .language-btn {
    margin-left: 4px;
    margin-right: 4px; /* Меньше отступов на мобильных */
  }
  .history-btn,
  .wallet-btn {
    margin-left: 8px;
    margin-right: 8px; /* Меньше отступов на мобильных */
  }
}
</style>
