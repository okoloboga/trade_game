import { defineStore } from 'pinia';
import apiService from '@/services/api';
import { useErrorStore } from '@/stores/error';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null,
    walletAddress: null,
    isConnected: false,
    tonProof: null,
  }),
  actions: {
    async init() {
      console.log('[authStore] Initializing, token:', this.token, 'localStorage.token:', localStorage.getItem('token'));
      if (this.token && !this.user) {
        try {
          const response = JSON.parse(localStorage.getItem('user') || '{}');
          if (response.ton_address) {
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
    async generateChallenge(clientId) {
      try {
        const response = await apiService.generateChallenge(clientId);
        console.log('[generateChallenge] Response:', response);
        return response;
      } catch (error) {
        console.error('[generateChallenge] Error:', error);
        useErrorStore().setError('Failed');
        throw error;
      }
    },
    async login(data) {
      try {
        const response = await apiService.login(data);
        console.log('[authStore] Login response:', JSON.stringify(response, null, 2));
        if (!response.access_token || !response.user) {
          throw new Error('Invalid login response: missing access_token or user');
        }
        console.log('[authStore] Saved token:', response.access_token);
        this.token = response.access_token;
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify({
          ton_address: response.user.ton_address,
          balance: response.user.balance,
          usdt_balance: response.user.usdt_balance,
          token_balance: response.user.token_balance,
        }));
        this.user = {
          ton_address: response.user.ton_address,
          balance: response.user.balance,
          usdt_balance: response.user.usdt_balance,
          token_balance: response.user.token_balance,
          walletAddress: response.user.ton_address,
        };
        this.walletAddress = response.user.ton_address;
        this.setConnected(true);
        return response;
      } catch (error) {
        console.error('[authStore] Login error:', error);
        useErrorStore().setError('Login failed: ' + (error.message || 'Unknown error'));
        throw error;
      }
    },
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.token = null;
      this.user = null;
      this.walletAddress = null;
      this.tonProof = null;
      this.setConnected(false);
    },
    setConnected(isConnected) {
      this.isConnected = isConnected;
    },
    setTonProof(proof) {
      this.tonProof = proof;
    },
  },
});
