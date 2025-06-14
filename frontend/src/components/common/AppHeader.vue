```vue
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useTonWallet, useTonConnectUI, TonConnectButton } from '@townsquarelabs/ui-vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import HomeIcon from '@/assets/home-icon.svg';
import HistoryIcon from '@/assets/history-icon.svg';
import WalletIcon from '@/assets/home-icon.svg';
import useInterval from '@/hooks/useInterval';

const { t } = useI18n();
const { language, changeLanguage } = useLanguage();

const wallet = useTonWallet();
const { tonConnectUI } = useTonConnectUI();
const walletAddress = ref(null);

let authStore, walletStore;
let stopRefreshInterval = null;

const refreshIntervalMs = 10 * 60 * 1000; // 10 minutes

const recreateProofPayload = async (address) => {
  if (!address) {
    console.warn('No wallet address provided, skipping tonProof generation');
    tonConnectUI.setConnectRequestParameters(null);
    return;
  }

  tonConnectUI.setConnectRequestParameters({ state: 'loading' });
  try {
    console.log('setConnectRequestParameters - loading')
    const payload = await authStore.generateChallenge(address);
    console.log('Payload with challenge:', payload);
    if (payload?.challenge) {
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: payload.challenge },
      });
    } else {
      tonConnectUI.setConnectRequestParameters(null);
    }
  } catch (error) {
    console.error('Failed to generate tonProof payload:', error);
    tonConnectUI.setConnectRequestParameters(null);
  }
};

const handleWalletConnect = async (walletData) => {
  try {
    console.log('Connecting wallet:', walletData);
    if (!walletData?.connectItems?.tonProof || !('proof' in walletData.connectItems.tonProof)) {
      throw new Error('No tonProof available');
    }

    const walletAddressRaw = walletData.account.address;
    const tonProof = walletData.connectItems.tonProof.proof;
    const account = {
      address: walletAddressRaw,
      publicKey: walletData.account.publicKey,
      chain: walletData.account.chain,
      walletStateInit: walletData.account.walletStateInit || '',
    };

    const verifyResult = await authStore.verifyProof({
      walletAddress: walletAddressRaw,
      tonProof,
      account,
    });

    if (!verifyResult.valid) {
      throw new Error('TON Proof verification failed');
    }

    await authStore.login({ ton_address: walletAddressRaw, tonProof, account });
    walletAddress.value = walletAddressRaw;
    authStore.setConnected(true);
    walletStore.syncFromAuthStore();
    console.log('Wallet connected and authorized');

    // Start periodic tonProof refresh
    stopRefreshInterval = useInterval(() => recreateProofPayload(walletAddressRaw), refreshIntervalMs);
  } catch (error) {
    console.error('Authorization failed:', error);
    authStore.logout();
    walletAddress.value = null;
    throw error;
  }
};

onMounted(async () => {
  const { useAuthStore } = await import('@/stores/auth');
  const { useWalletStore } = await import('@/stores/wallet');
  authStore = useAuthStore();
  walletStore = useWalletStore();

  await authStore.init();
  if (tonConnectUI && tonConnectUI.connected && wallet.value) {
    walletAddress.value = wallet.value.account.address;
    await handleWalletConnect(wallet.value);
    console.log('Wallet already connected, synced state');
  }

  // Listen for wallet status changes
  tonConnectUI.onStatusChange(async (walletData) => {
    if (walletData) {
      await handleWalletConnect(walletData);
    } else {
      authStore.logout();
      walletAddress.value = null;
      if (stopRefreshInterval) {
        stopRefreshInterval();
        stopRefreshInterval = null;
      }
      tonConnectUI.setConnectRequestParameters(null);
      console.log('Wallet disconnected');
    }
  });
});

onUnmounted(() => {
  if (stopRefreshInterval) {
    stopRefreshInterval();
    stopRefreshInterval = null;
  }
});

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
