```vue
<template>
  <v-dialog v-model="modelValue" max-width="320" teleport="#app">
    <v-card color="black">
      <v-card-title>Deposit Dialog</v-card-title>
      <v-card-text>
        <p>This is a minimal deposit dialog.</p>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

console.log('[DepositDialog] Component mounted, initial modelValue:', props.modelValue);

watch(() => props.modelValue, (newValue) => {
  console.log('[DepositDialog] modelValue changed:', newValue);
});
</script>

<style scoped>
.v-dialog {
  z-index: 2000 !important;
}
</style>
