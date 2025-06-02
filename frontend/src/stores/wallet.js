import { defineStore } from 'pinia'
import apiService from '@/services/api'
import { useErrorStore } from '@/stores/error'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    balance: 0,
    tokenBalance: 0,
    depositAddress: null,
    tonPrice: 0,
    transactions: [],
    isProcessing: false,
  }),
  actions: {
    async fetchWalletData() {
      try {
        const response = await apiService.getWalletData()
        this.balance = response.balance
        this.tokenBalance = response.token_balance
        this.depositAddress = response.deposit_address || response.address
      } catch (error) {
        useErrorStore().setError('Failed to fetch wallet data')
        throw error
      }
    },
    async fetchTonPrice() {
      try {
        const response = await apiService.getTonPrice()
        this.tonPrice = response.price
      } catch (error) {
        useErrorStore().setError('Failed to fetch TON price')
        throw error
      }
    },
    async fetchTransactions() {
      try {
        const response = await apiService.getTransactions()
        this.transactions = response.transactions
      } catch (error) {
        useErrorStore().setError('Failed to fetch transactions')
        throw error
      }
    },
    async deposit(amount) {
      this.isProcessing = true
      try {
        const response = await apiService.deposit(amount, 'pending')
        this.balance = response.user.balance
        return response
      } catch (error) {
        useErrorStore().setError('Deposit failed')
        throw error
      } finally {
        this.isProcessing = false
      }
    },
    async withdraw(amount) {
      this.isProcessing = true
      try {
        const response = await apiService.withdraw(amount)
        this.balance = response.user.balance
        return response
      } catch (error) {
        useErrorStore().setError('Withdrawal failed')
        throw error
      } finally {
        this.isProcessing = false
      }
    },
    async withdrawTokens(amount) {
      this.isProcessing = true
      try {
        const response = await apiService.withdrawTokens(amount)
        this.tokenBalance = response.user.token_balance
        return response
      } catch (error) {
        useErrorStore().setError('RUBLE withdrawal failed')
        throw error
      } finally {
        this.isProcessing = false
      }
    },
  },
})
