<template>
  <v-dialog :value="modelValue" @update:modelValue="emit('update:modelValue', $event)" max-width="320" teleport="#app">
    <v-card color="black">
      <v-card-title>Test Deposit Dialog</v-card-title>
      <v-card-text>
        <p>This is a test dialog.</p>
        <v-text-field
          v-model.number="amount"
          label="Amount ($)"
          type="number"
          :min="0.01"
          step="0.01"
          variant="outlined"
          color="white"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" @click="closeDialog">Deposit</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);
const amount = ref(0.1);

console.log('[DepositDialog] Initial modelValue:', props.modelValue);

watch(() => props.modelValue, (newValue) => {
  console.log('[DepositDialog] modelValue changed:', newValue);
});

const closeDialog = () => {
  console.log('[DepositDialog] Closing dialog');
  emit('update:modelValue', false);
  amount.value = 0.1;
};
</script>

<style scoped>
.v-dialog {
  z-index: 2000 !important;
}
</style>
