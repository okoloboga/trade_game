import { useTonConnectUI } from '@townsquarelabs/ui-vue'

export class TonConnectService {
  constructor(manifestUrl = import.meta.env.VITE_APP_URL) {
    // Инициализация tonConnectUI через хук
    const { tonConnectUI } = useTonConnectUI()
    this.tonConnectUI = tonConnectUI
    // Настройка manifestUrl
    this.tonConnectUI.setConnectRequestParameters({
      state: 'ready',
      value: { tonProof: `${manifestUrl}/manifest.json`}
    })
  }

  async connect() {
    try {
      const wallet = await this.tonConnectUI.connectWallet()
      console.log('Wallet connected:', JSON.stringify(wallet, null, 2));
      if (!wallet?.account?.address) {
        throw new Error('Failed to connect wallet')
      }
      return wallet
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw new Error(`Wallet connection failed: ${error.message}`)
    }
  }

  async signData(data) {
    try {
      // Используем tonProof для подписи
      const wallet = this.tonConnectUI.wallet
      if (!wallet?.connectItems?.tonProof) {
        throw new Error('No tonProof available')
      }
      // Предполагаем, что data — это payload для подписи
      const result = {
        proof: wallet.connectItems.tonProof.proof,
        payload: data
      }
      return result
    } catch (error) {
      throw new Error(`Data signing failed: ${error.message}`)
    }
  }

  async sendTransaction(transaction) {
    try {
      const result = await this.tonConnectUI.sendTransaction(transaction)
      return result
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`)
    }
  }

  async disconnect() {
    try {
      await this.tonConnectUI.disconnect()
    } catch (error) {
      throw new Error(`Disconnection failed: ${error.message}`)
    }
  }
}
