<template>
  <v-data-table
    :headers="headers"
    :items="walletStore.transactions"
    :items-per-page="5"
    :loading="loading"
    class="elevation-1"
  >
    <template v-slot:item.amount="{ item }">
      {{ formatCurrency(Number(item.amount)) }}
    </template>
    <template v-slot:item.created_at="{ item }">
      {{ formatDate(item.created_at) }}
    </template>
  </v-data-table>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useWalletStore } from '@/stores/wallet';
import { useErrorStore } from '@/stores/error';
import { useAuthStore } from '@/stores/auth';
import { useI18n } from 'vue-i18n';
import { formatCurrency, formatDate } from '@/utils/formatters';

const walletStore = useWalletStore();
const errorStore = useErrorStore();
const authStore = useAuthStore();
const loading = ref(false);
const { t } = useI18n();

const headers = computed(() => [
  { title: t('transaction_headers.type'), key: 'type' },
  { title: t('transaction_headers.amount'), key: 'amount' },
  { title: t('transaction_headers.status'), key: 'status' },
  { title: t('transaction_headers.date'), key: 'created_at' },
]);

onMounted(async () => {
  console.log('authStore.isConnected:', authStore.isConnected);
  console.log('authStore.user:', authStore.user);
  console.log('authStore.user.ton_address:', authStore.user?.ton_address);
  loading.value = true;
  try {
    await walletStore.fetchTransactions();
    console.log('[TransactionHistory] Transactions:', walletStore.transactions);
  } catch (error) {
    console.error('[TransactionHistory] Error fetching transactions:', error);
    errorStore.setError(t('load_transaction_history'));
  } finally {
    loading.value = false;
  }
});
</script>
