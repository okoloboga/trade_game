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
import { TonConnectUIProvider } from '@townsquarelabs/ui-vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import Notification from '@/components/common/Notification.vue';

const options = {
  manifestUrl: `${import.meta.env.VITE_APP_URL}/manifest.json`,
};
</script>
