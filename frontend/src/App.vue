<template>
  <v-app>
    <DefaultLayout>
      <router-view />
    </DefaultLayout>
    <Notification />
  </v-app>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import Notification from '@/components/common/Notification.vue';

const options = {
  manifestUrl: `${import.meta.env.VITE_APP_URL}/manifest.json`,
};
</script>

<style>
.v-dialog .v-overlay {
  z-index: 2000 !important;
}
</style>
