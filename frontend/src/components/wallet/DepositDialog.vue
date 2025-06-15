<template>
  <v-dialog v-model="internalModelValue" max-width="320">
    <v-card>
      <v-card-title>Test Deposit Dialog</v-card-title>
      <v-card-text>This is a test deposit dialog.</v-card-text>
      <v-card-actions>
        <v-btn @click="internalModelValue = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
});

const emit = defineEmits(['update:modelValue']);

const internalModelValue = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});
</script>
