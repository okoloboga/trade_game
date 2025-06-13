import { useTonConnectUI } from '@townsquarelabs/ui-vue';
import { useAuthStore } from '@/stores/auth';

export class TonConnectService {
  constructor() {
    const { tonConnectUI } = useTonConnectUI();
    this.tonConnectUI = tonConnectUI;
    this.authStore = useAuthStore();
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
