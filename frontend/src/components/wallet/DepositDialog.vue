<template>
  <v-dialog v-model="modelValue" max-width="320">
    <v-card>
      <v-card-title>Deposit Dialog</v-card-title>
      <v-card-text>
        <p style="color: red;">Rendering DepositDialog!</p>
        <p>This is a minimal deposit dialog.</p>
      </v-card-text>
      <v-card-actions>
        <v-btn @click="modelValue = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue';

const modelValue = ref(false);
defineProps(['modelValue']);
defineEmits(['update:modelValue']);
</script>
