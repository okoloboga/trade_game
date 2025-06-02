import { defineStore } from 'pinia'
import api from '@/services/api'
import { useErrorStore } from '@/stores/error'
import { validateWalletAddress } from '@/utils/validator'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isConnected: false,
    walletAddress: null,
  }),
  actions: {
    async generateChallenge(walletAddress) {
      const validation = validateWalletAddress(walletAddress)
      if (validation !== true) {
        useErrorStore().setError(validation)
        throw new Error(validation)
      }
      try {
        const response = await api.get(`/challenge/generate`, { params: { walletAddress } })
        return response.data
      } catch (error) {
        useErrorStore().setError('Failed to generate challenge')
        throw error
      }
    },
    async verifyProof(proof) {
      if (!proof) {
        useErrorStore().setError('Proof is required')
        throw new Error('Proof is required')
      }
      try {
        const response = await api.post('/challenge/verify', proof)
        return response.data
      } catch (error) {
        useErrorStore().setError('Proof verification failed')
        throw error
      }
    },
    async login(walletAddress) {
      const validation = validateWalletAddress(walletAddress)
      if (validation !== true) {
        useErrorStore().setError(validation)
        throw new Error(validation)
      }
      try {
        localStorage.removeItem('token')
        const response = await api.post('/auth/login', { walletAddress })
        this.token = response.data.token
        this.user = { id: response.data.user.id, ...response.data.user }
        this.isConnected = true
        this.walletAddress = walletAddress
        localStorage.setItem('token', this.token)
        useErrorStore().setError('Login successful', false)
      } catch (error) {
        useErrorStore().setError('Login failed')
        throw error
      }
    },
    async verifyToken() {
      if (!this.token) {
        this.logout()
        return
      }
      try {
        const response = await api.get('/auth/verify')
        this.user = { id: response.data.user.id, ...response.data.user }
        this.isConnected = true
        this.walletAddress = response.data.walletAddress
      } catch (error) {
        this.logout()
        useErrorStore().setError('Session verification failed')
        throw error
      }
    },
    logout() {
      this.token = null
      this.user = null
      this.isConnected = false
      this.walletAddress = null
      localStorage.removeItem('token')
    },
  },
})
