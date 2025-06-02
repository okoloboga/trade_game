import { defineStore } from 'pinia'

  export const useAppStore = defineStore('app', {
    state: () => ({
      globalLoading: false,
    }),
    actions: {
      setLoading(loading) {
        this.globalLoading = loading
      },
    },
  })
