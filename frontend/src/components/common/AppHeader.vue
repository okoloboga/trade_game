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
          <TonConnectButton />
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
import { TonConnectButton, useTonWallet, useTonConnectUI } from '@townsquarelabs/ui-vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import HomeIcon from '@/assets/home-icon.svg';
import HistoryIcon from '@/assets/history-icon.svg';
import WalletIcon from '@/assets/wallet-icon.svg';

const { t } = useI18n();
const { language, changeLanguage } = useLanguage();
const showDeposit = ref(false);
const showWithdraw = ref(false);

const wallet = useTonWallet();
const { tonConnectUI } = useTonConnectUI();
const isWalletConnected = ref(false);
const walletAddress = ref(null);
let interval = null;

let authStore, walletStore;

onMounted(async () => {
  const { useAuthStore } = await import('@/stores/auth');
  const { useWalletStore } = await import('@/stores/wallet');
  authStore = useAuthStore();
  walletStore = useWalletStore();

  console.log('AppHeader mounted, initial wallet:', !!wallet.value);
  await authStore.init();

  // Проверяем, подключён ли кошелёк
  if (tonConnectUI.connected && wallet.value && !isWalletConnected.value) {
    console.log('Initial tonConnectUI check:', tonConnectUI.connected && wallet.value && !isWalletConnected.value)
    isWalletConnected.value = true;
    walletAddress.value = wallet.value.account.address;
    await handleWalletConnect(wallet.value);
  }

  tonConnectUI.onStatusChange(async (newWallet) => {
    console.log('Wallet status changed:', !!newWallet);

    if (newWallet && !isWalletConnected.value) {
      isWalletConnected.value = true;
      walletAddress.value = newWallet.account.address;

      try {
        tonConnectUI.setConnectRequestParameters({
          state: 'ready',
          value: { tonProof: 'trade.ruble.website' },
        });
        const walletData = await tonConnectUI.connectWallet();
        if (walletData?.account?.address) {
          await handleWalletConnect(walletData);
        }
      } catch (error) {
        console.error('Wallet connection failed:', error);
      }

    } else if (!newWallet) {
      isWalletConnected.value = false;
      walletAddress.value = null;
      authStore.logout();
      clearInterval(interval); // Останавливаем обновление при отключении
    }
  });
});

async function handleWalletConnect(wallet) {
  try {
    console.log('Handling wallet:', wallet);
    const walletAddressRaw = wallet.account.address;

    // Запрашиваем challenge и устанавливаем его для tonProof
    const challenge = await authStore.generateChallenge(walletAddressRaw);
    if (!challenge) {
      throw new Error('Failed to generate challenge');
    }
    console.log('Challenge generated:', challenge);

    // Проверяем tonProof
    const tonProof = wallet.connectItems?.tonProof;
    console.log('TonProof:', wallet.connectItems?.tonProof);

    if (!wallet.connectItems?.tonProof) {
      throw new Error('No tonProof available');
    }

    if (tonProof.proof.payload !== challenge) {
      throw new Error('Invalid tonProof');
    };

    console.log('tonProof:', JSON.stringify(tonProof, null, 2));

    const account = {
      address: walletAddressRaw,
      publicKey: wallet.account.publicKey,
      chain: wallet.account.chain,
      walletStateInit: wallet.account.walletStateInit || '',
    };
    console.log('Account:', JSON.stringify(account, null, 2));

    const verifyResult = await authStore.verifyProof({
      walletAddress: walletAddressRaw,
      tonProof,
      account,
    });
    console.log('Verify result:', verifyResult);

    if (!verifyResult.valid) {
      throw new Error('TON Proof verification failed');
    }

    await authStore.login({ ton_address: walletAddressRaw, tonProof, account });
    console.log('Login successful');
    isWalletConnected.value = true;
    walletAddress.value = walletAddressRaw;
    authStore.setConnected(true);
    walletStore.syncFromAuthStore();

    // Запускаем периодическое обновление challenge для поддержания сессии
    interval = setInterval(() => refreshPayload(walletAddressRaw), 15 * 60 * 1000); // Каждые 15 минут
  } catch (error) {
    console.error('Authorization failed:', error);
    tonConnectUI.setConnectRequestParameters(null);
    isWalletConnected.value = false;
    walletAddress.value = null;
    authStore.logout();
    throw error;
  }
}

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
