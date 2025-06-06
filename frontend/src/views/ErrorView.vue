<template>
  <v-container fluid>
    <v-card color="black" class="pa-4 text-center">
      <v-card-title class="text-h4">{{ $t('e404') }}</v-card-title>
      <v-card-text>
        <p>{{ $t('page_doesnt_exist') }}</p>
        <v-btn color="primary" to="/">{{ $t('go_home') }}</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { useErrorStore } from '@/stores/error'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const errorStore = useErrorStore()

onMounted(() => {
  errorStore.setError('Page not found', true)
})
</script>
