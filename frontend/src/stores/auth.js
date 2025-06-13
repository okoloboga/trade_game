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
    async init() {
      if (this.token && !this.user) {
        try {
          const response = JSON.parse(localStorage.getItem('user') || '{}');
          if (response.id && response.ton_address) {
            this.user = response;
            this.walletAddress = response.ton_address;
            this.setConnected(true);
          } else {
            this.logout();
          }
        } catch (error) {
          this.logout();
          useErrorStore().setError('Failed to restore session');
        }
      }
    },
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
        localStorage.setItem('user', JSON.stringify(response.user));
        this.token = response.access_token;
        this.user = response.user;
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
      localStorage.removeItem('user');
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
