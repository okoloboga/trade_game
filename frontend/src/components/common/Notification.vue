<template>
  <v-snackbar
    v-model="errorStore.show"
    :timeout="5000"
    :color="errorStore.isError ? 'error' : 'success'"
    location="top"
    elevation="24"
  >
    {{ errorStore.message }}
    <template #actions>
      <v-btn
        color="white"
        variant="text"
        @click="errorStore.clearError"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
import { useErrorStore } from '@/stores/error'
const errorStore = useErrorStore()
</script>
