import { useTonConnectUI } from '@townsquarelabs/ui-vue';
import { useAuthStore } from '@/stores/auth';

export class TonConnectService {
  constructor(manifestUrl = import.meta.env.VITE_APP_URL) {
    const { tonConnectUI } = useTonConnectUI();
    this.tonConnectUI = tonConnectUI;
    this.authStore = useAuthStore();
    this.tonConnectUI.setConnectRequestParameters({
      state: 'ready',
      value: { tonProof: `${manifestUrl}/manifest.json` },
    });

    // Слушаем изменения статуса кошелька
    this.tonConnectUI.onStatusChange(async (wallet) => {
      console.log('Wallet status changed:', JSON.stringify(wallet, null, 2));
      if (wallet) {
        await this.handleWalletConnect(wallet);
      } else {
        await this.authStore.logout();
      }
    });
  }

  async connect() {
    try {
      const wallet = await this.tonConnectUI.connectWallet();
      console.log('Wallet connected:', JSON.stringify(wallet, null, 2));
      return wallet;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw new Error(`Wallet connection failed: ${error.message}`);
    }
  }

  async handleWalletConnect(wallet) {
    try {
      if (!wallet?.account?.address) {
        throw new Error('No wallet address');
      }
      const walletAddress = wallet.account.address;

      // Генерация challenge
      const { challenge } = await this.authStore.generateChallenge(walletAddress);

      // Формирование tonProof
      if (!wallet.connectItems?.tonProof) {
        throw new Error('No tonProof available');
      }
      const tonProof = wallet.connectItems.tonProof;

      // Формирование account
      const account = {
        address: wallet.account.address,
        publicKey: wallet.account.publicKey,
        chain: wallet.account.chain,
        walletStateInit: wallet.account.walletStateInit || '',
      };

      // Проверка tonProof
      const verifyResult = await this.authStore.verifyProof({
        walletAddress,
        tonProof,
        account,
      });

      if (!verifyResult.valid) {
        throw new Error('TON Proof verification failed');
      }

      // Логин
      await this.authStore.login({ ton_address: walletAddress, tonProof, account });
    } catch (error) {
      console.error('Authorization failed:', error);
      await this.authStore.logout();
      throw new Error(`Authorization failed: ${error.message}`);
    }
  }

  async sendTransaction(transaction) {
    try {
      const result = await this.tonConnectUI.sendTransaction(transaction);
      return result;
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      await this.tonConnectUI.disconnect();
    } catch (error) {
      throw new Error(`Disconnection failed: ${error.message}`);
    }
  }
}
