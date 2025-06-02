<template>
  <v-main>
    <v-app-bar color="black" flat>
      <v-toolbar-title>Trade App</v-toolbar-title>
      <v-spacer />
      <v-btn to="/" text>Home</v-btn>
      <v-btn to="/history" text>History</v-btn>
      <WalletConnect />
    </v-app-bar>
    <v-container fluid>
      <v-progress-circular
        v-if="appStore.globalLoading"
        indeterminate
        color="primary"
        class="global-spinner"
      />
      <slot />
    </v-container>
  </v-main>
</template>

<script setup>
import { useAppStore } from '@/stores/app'
import WalletConnect from '@/components/wallet/WalletConnect.vue'
const appStore = useAppStore()
</script>

<style scoped>
.global-spinner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
