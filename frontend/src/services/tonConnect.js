import { useTonConnectUI } from '@townsquarelabs/ui-vue';
import { useAuthStore } from '@/stores/auth';

export class TonConnectService {
  constructor(manifestUrl = import.meta.env.VITE_APP_URL) {
    try {
      console.log('Initializing TonConnectService with manifest:', manifestUrl);
      const { tonConnectUI } = useTonConnectUI();
      this.tonConnectUI = tonConnectUI;
      this.authStore = useAuthStore();
      console.log('TonConnectUI initialized:', !!this.tonConnectUI);

      if (!this.tonConnectUI) {
        throw new Error('TonConnectUI not initialized');
      }

      this.tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: 'trade.ruble.website' },
      });

      this.tonConnectUI.onStatusChange(async (wallet) => {
        console.log('Wallet status changed:', JSON.stringify(wallet, null, 2));
        if (wallet) {
          await this.handleWalletConnect(wallet);
        } else {
          console.log('Wallet disconnected');
          await this.authStore.logout();
        }
      });
    } catch (error) {
      console.error('Failed to initialize TonConnectService:', error);
    }
  }

  async connect() {
    try {
      console.log('Attempting to connect wallet');
      const wallet = await this.tonConnectUI.connectWallet();
      console.log('Wallet connected:', JSON.stringify(wallet, null, 2));
      await this.handleWalletConnect(wallet);
      return wallet;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw new Error(`Wallet connection failed: ${error.message}`);
    }
  }

  async handleWalletConnect(wallet) {
    try {
      console.log('Handling wallet connect:', wallet);
      if (!wallet?.account?.address) {
        throw new Error('No wallet address');
      }
      const walletAddress = wallet.account.address;
      console.log('Wallet address:', walletAddress);

      const { challenge } = await this.authStore.generateChallenge(walletAddress);
      console.log('Challenge generated:', challenge);

      console.log('Wallet connectItems:', JSON.stringify(wallet.connectItems, null, 2));
      if (!wallet.connectItems?.tonProof) {
        throw new Error('No tonProof available');
      }
      const tonProof = wallet.connectItems.tonProof;
      console.log('tonProof:', JSON.stringify(tonProof, null, 2));

      const account = {
        address: wallet.account.address,
        publicKey: wallet.account.publicKey,
        chain: wallet.account.chain,
        walletStateInit: wallet.account.walletStateInit || '',
      };
      console.log('Account:', JSON.stringify(account, null, 2));

      const verifyResult = await this.authStore.verifyProof({
        walletAddress,
        tonProof,
        account,
      });
      console.log('Verify result:', verifyResult);

      if (!verifyResult.valid) {
        throw new Error('TON Proof verification failed');
      }

      await this.authStore.login({ ton_address: walletAddress, tonProof, account });
      console.log('Login successful');
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
