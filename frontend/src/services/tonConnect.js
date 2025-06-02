import { TonConnect } from '@tonconnect/sdk'

export class TonConnectService {
  constructor(manifestUrl = import.meta.env.VITE_TONCONNECT_MANIFEST_URL) {
    this.connector = new TonConnect({
      manifestUrl: manifestUrl || 'https://your-domain.com/tonconnect-manifest.json',
    })
  }

  async connect() {
    try {
      const wallet = await this.connector.connect()
      if (!wallet?.account?.address) {
        throw new Error('Failed to connect wallet')
      }
      return wallet
    } catch (error) {
      throw new Error(`Wallet connection failed: ${error.message}`)
    }
  }

  async signData(data) {
    try {
      const result = await this.connector.signData(data)
      return result
    } catch (error) {
      throw new Error(`Data signing failed: ${error.message}`)
    }
  }

  async sendTransaction(transaction) {
    try {
      const result = await this.connector.sendTransaction(transaction)
      return result
    } catch (error) {
      throw new Error(`Transaction failed: ${error.message}`)
    }
  }

  async disconnect() {
    try {
      await this.connector.disconnect()
    } catch (error) {
      throw new Error(`Disconnection failed: ${error.message}`)
    }
  }
}
