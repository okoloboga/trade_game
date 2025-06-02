<template>
  <v-container fluid>
    <v-card color="black" class="pa-4 text-center">
      <v-card-title class="text-h4">404 - Page Not Found</v-card-title>
      <v-card-text>
        <p>The page you're looking for doesn't exist.</p>
        <v-btn color="primary" to="/">Go to Home</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { useErrorStore } from '@/stores/error'

const router = useRouter()
const errorStore = useErrorStore()

onMounted(() => {
  errorStore.setError('Page not found', true)
})
</script>
