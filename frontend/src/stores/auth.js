import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';
import { validateWalletAddress } from '@/utils/validators';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isConnected: false,
    walletAddress: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && state.isConnected,
    getWalletAddress: (state) => state.walletAddress,
  },
  actions: {
    setConnected(status) {
      this.isConnected = status;
    },
    async generateChallenge(walletAddress) {
      const validation = validateWalletAddress(walletAddress);
      if (validation !== true) {
        useErrorStore().setError(validation);
        throw new Error(validation);
      }
      try {
        const response = await apiService.generateChallenge(walletAddress);
        return response;
      } catch (error) {
        useErrorStore().setError('Failed to generate challenge');
        throw error;
      }
    },
    async verifyProof({ walletAddress, tonProof, account }) {
      if (!walletAddress || !tonProof || !account) {
        useErrorStore().setError('Missing required parameters');
        throw new Error('Missing required parameters');
      }
      try {
        const response = await apiService.verifyProof({ walletAddress, tonProof, account });
        return response;
      } catch (error) {
        useErrorStore().setError('Proof verification failed');
        throw error;
      }
    },
    async login({ ton_address, tonProof, account }) {
      const validation = validateWalletAddress(ton_address);
      if (validation !== true) {
        useErrorStore().setError(validation);
        throw new Error(validation);
      }
      try {
        localStorage.removeItem('token');
        const response = await apiService.login({ ton_address, tonProof, account });
        this.token = response.access_token;
        this.user = { id: response.user.id, ...response.user };
        this.setConnected(true);
        this.walletAddress = ton_address;
        localStorage.setItem('token', this.token);
        useErrorStore().setError('Login successful', false);
      } catch (error) {
        useErrorStore().setError('Login failed');
        throw error;
      }
    },
    async verifyToken() {
      if (!this.token) {
        this.logout();
        return;
      }
      try {
        const response = await apiService.getWalletData();
        this.user = { id: response.user.id, ...response.user };
        this.setConnected(true);
        this.walletAddress = response.walletAddress;
      } catch (error) {
        this.logout();
        useErrorStore().setError('Session verification failed');
        throw error;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      this.setConnected(false);
      this.walletAddress = null;
      localStorage.removeItem('token');
    },
  },
});
