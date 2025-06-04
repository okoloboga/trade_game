<template>
  <v-app>
    <DefaultLayout>
      <router-view />
    </DefaultLayout>
    <Notification />
  </v-app>
</template>

<script setup>
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Notification from '@/components/common/Notification.vue'
</script>
