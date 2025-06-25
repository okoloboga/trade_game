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
/* Увеличиваем специфичность селектора */
.v-application .v-container,
.v-container {
  padding: 2px !important;
}

/* Перекрываем медиа-запросы Vuetify */
@media (min-width: 600px) {
  .v-application .v-container,
  .v-container {
    padding: 2px !important;
  }
}
@media (min-width: 960px) {
  .v-application .v-container,
  .v-container {
    padding: 2px !important;
  }
}
@media (min-width: 1264px) {
  .v-application .v-container,
  .v-container {
    padding: 2px !important;
  }
}
@media (min-width: 1904px) {
  .v-application .v-container,
  .v-container {
    padding: 2px !important;
  }
}

.v-dialog .v-overlay {
  z-index: 2000 !important;
}
</style>
