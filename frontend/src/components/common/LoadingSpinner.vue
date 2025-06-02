<template>
  <v-progress-circular
    indeterminate
    color="primary"
    size="32"
    v-if="isLoading"
  />
</template>

<script setup>
defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
})
</script>
