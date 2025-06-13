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
    } catch (error) {
      console.error('Failed to initialize TonConnectService:', error);
    }
  }

  async disconnect() {
    try {
      await this.tonConnectUI.disconnect();
      await this.authStore.logout();
    } catch (error) {
      throw new Error(`Disconnection failed: ${error.message}`);
    }
  }
}
