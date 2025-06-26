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
    /**
     * Initializes the authentication store by restoring session from localStorage.
     */
    async init() {
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
    /**
     * Generates a challenge for TON proof authentication.
     * @param {string} clientId - The client ID for the challenge.
     * @returns {Promise<Object>} The challenge response data.
     */
    async generateChallenge(clientId) {
      try {
        const response = await apiService.generateChallenge(clientId);
        return response;
      } catch (error) {
        console.error('[generateChallenge] Error:', error);
        useErrorStore().setError('Failed');
        throw error;
      }
    },
    /**
     * Logs in a user with TON wallet credentials.
     * @param {Object} data - The login data including TON address and proof.
     * @returns {Promise<Object>} The login response data.
     */
    async login(data) {
      try {
        const response = await apiService.login(data);
        if (!response.access_token || !response.user) {
          throw new Error('Invalid login response: missing access_token or user');
        }
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
        throw error;
      }
    },
    /**
     * Verifies the validity of the stored JWT token.
     * @returns {Promise<Object>} The token verification response data.
     */
    async verifyToken() {
      try {
        const response = await apiService.verifyToken(this.token);
        if (response.valid) {
          await this.init();
          return response;
        } else {
          this.logout();
          throw new Error('Token verification failed');
        }
      } catch (error) {
        console.error('[authStore] Verify token failed:', error);
        this.logout();
        throw error;
      }
    },
    /**
     * Logs out the user and clears authentication data.
     */
    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('ton-connect-storage_bridge-connection');
      localStorage.removeItem('ton-connect-ui_last-selected-wallet-info');
      localStorage.removeItem('ton-connect-ui_wallet-info');
      this.token = null;
      this.user = null;
      this.walletAddress = null;
      this.tonProof = null;
      this.setConnected(false);
    },
    /**
     * Sets the connection status of the user.
     * @param {boolean} isConnected - The connection status.
     */
    setConnected(isConnected) {
      this.isConnected = isConnected;
    },
    /**
     * Sets the TON proof data.
     * @param {Object|null} proof - The TON proof data or null.
     */
    setTonProof(proof) {
      this.tonProof = proof;
    },
  },
});
