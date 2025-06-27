<template>
  <v-main>
    <AppHeader />
    <v-container fluid>
      <slot />
    </v-container>
  </v-main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'

const globalLoading = ref(false)

onMounted(async () => {
  const { useAppStore } = await import('@/stores/app')
  const appStore = useAppStore()
  globalLoading.value = computed(() => appStore.globalLoading).value
})
</script>

<style scoped>
.global-spinner {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
