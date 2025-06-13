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
        <v-col cols="4" class="text-center">
          <TonConnectButton />
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
import { ref, onMounted } from 'vue';
import { useTonWallet, useTonConnectUI } from '@townsquarelabs/ui-vue';
import { useLanguage } from '@/composables/useLanguage';
import { useI18n } from 'vue-i18n';
import HomeIcon from '@/assets/home-icon.svg';
import HistoryIcon from '@/assets/history-icon.svg';
import WalletIcon from '@/assets/home-icon.svg';

const { t } = useI18n();
const { language, changeLanguage } = useLanguage();
const showDeposit = ref(false);
const showWithdraw = ref(false);
const showWalletMenu = ref(false);

const wallet = useTonWallet();
const { tonConnectUI } = useTonConnectUI();
const isWalletConnected = ref(false);
const walletAddress = ref(null);

let authStore, walletStore;

onMounted(async () => {
  const { useAuthStore } = await import('@/stores/auth');
  const { useWalletStore } = await import('@/stores/wallet');
  authStore = useAuthStore();
  walletStore = useWalletStore();

  console.log('AppHeader mounted, initial wallet:', !!wallet.value);
  await authStore.init();
  if (tonConnectUI && tonConnectUI.connected && wallet.value && !isWalletConnected.value) {
    isWalletConnected.value = true;
    walletAddress.value = wallet.value.account.address;
    authStore.setConnected(true);
    walletStore.syncFromAuthStore();
    console.log('Wallet already connected, synced state');
  }
});

async function connectWallet() {
  try {
    if (tonConnectUI.connected) {
      console.log('Wallet already connected, skipping');
      return;
    }
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
}

async function handleWalletConnect(wallet) {
  try {
    const walletAddressRaw = wallet.account.address;
    console.log('Handling wallet connect for raw address:', walletAddressRaw);

    const { challenge } = await authStore.generateChallenge(walletAddressRaw);
    console.log('Challenge generated:', challenge);

    if (!wallet.connectItems?.tonProof) {
      throw new Error('No tonProof available');
    }
    const tonProof = wallet.connectItems.tonProof;
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
  } catch (error) {
    console.error('Authorization failed:', error);
    authStore.logout();
    isWalletConnected.value = false;
    walletAddress.value = null;
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
