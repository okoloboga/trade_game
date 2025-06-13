import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null,
    walletAddress: null,
    isConnected: false,
  }),
  actions: {
    async generateChallenge(walletAddress) {
      try {
        const response = await apiService.generateChallenge(walletAddress);
        return response;
      } catch (error) {
        useErrorStore().setError('Failed to generate challenge');
        throw error;
      }
    },
    async verifyProof(data) {
      try {
        const response = await apiService.verifyProof(data);
        return response;
      } catch (error) {
        useErrorStore().setError('Failed to verify proof');
        throw error;
      }
    },
    async login(data) {
      try {
        const response = await apiService.login(data);
        localStorage.setItem('token', response.access_token);
        this.token = response.access_token;
        this.user = response.user; // Сохраняем данные пользователя
        this.walletAddress = response.user.ton_address;
        this.setConnected(true);
        return response;
      } catch (error) {
        useErrorStore().setError('Login failed');
        throw error;
      }
    },
    logout() {
      localStorage.removeItem('token');
      this.token = null;
      this.user = null;
      this.walletAddress = null;
      this.setConnected(false);
    },
    setConnected(isConnected) {
      this.isConnected = isConnected;
    },
  },
});
