import { defineStore } from 'pinia'

export const useErrorStore = defineStore('error', {
  state: () => ({
    show: false,
    message: '',
    isError: true,
  }),
  actions: {
    setError(message, isError = true) {
      this.show = true
      this.message = message
      this.isError = isError
    },
    clearError() {
      this.show = false
      this.message = ''
      this.isError = true
    },
  },
})
