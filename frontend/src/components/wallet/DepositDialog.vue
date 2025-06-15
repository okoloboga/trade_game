```vue
<template>
  <v-dialog :value="modelValue" @update:modelValue="emit('update:modelValue', $event)" max-width="320" teleport="#app">
    <v-card color="black">
      <v-card-title>{{ $t('deposit_ton') }}</v-card-title>
      <v-card-text>
        <p>Test Deposit Dialog</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeDialog">{{ $t('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);

console.log('[DepositDialog] Initial modelValue:', props.modelValue);

watch(() => props.modelValue, (newValue) => {
  console.log('[DepositDialog] modelValue changed:', newValue);
});

const closeDialog = () => {
  console.log('[DepositDialog] Closing dialog');
  emit('update:modelValue', false);
};
</script>

<style scoped>
.v-dialog {
  z-index: 2000 !important;
}
</style>
