```vue
<template>
  <v-dialog :value="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="320">
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

watch(() => props.modelValue, (newValue, oldValue) => {
  console.log('[DepositDialog] modelValue changed:', newValue, 'from:', oldValue);
});
</script>

<style scoped>
.v-dialog {
  z-index: 2000 !important;
}
</style
