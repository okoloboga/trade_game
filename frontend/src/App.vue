<template>
  <TonConnectUIProvider :options="options">
    <v-app>
      <DefaultLayout>
        <router-view />
      </DefaultLayout>
      <Notification />
    </v-app>
  </TonConnectUIProvider>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import Notification from '@/components/common/Notification.vue';
import { TonConnectUIProvider } from '@townsquarelabs/ui-vue';

const options = {
  manifestUrl: `${import.meta.env.VITE_APP_URL}/tonconnect-manifest.json`,
};
</script>

<style>

:global(.v-container) {
  padding: 4px !important; /* Переопределяем padding с 16px на 4px */
}

.v-dialog .v-overlay {
  z-index: 2000 !important;
}
</style>
