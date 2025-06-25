<template>
  <v-card color="black" class="trade-buttons">
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <div class="text-body-1 text-white">
            {{ $t('ton_balance') }}: {{ walletStore.balance ? walletStore.balance.toFixed(4) : '0.0000' }}
            <span v-if="currentPrice"> (~${{ (walletStore.balance * currentPrice).toFixed(4) }})</span>
          </div>
        </v-col>
        <v-col cols="6">
          <div class="text-body-1 text-white">
            {{ $t('usdt_balance') }}: {{ walletStore.usdt_balance ?
            walletStore.usdt_balance.toFixed(4) : '0.0000' }}
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6">
          <v-text-field
            v-model.number="amount"
            :label="$t('amount_label')"
            type="number"
            :min="0.01"
            step="0.01"
            variant="outlined"
            color="white"
            :rules="amountRules"
          >
            <template #details>
              <div v-if="amount && currentPrice" class="text-caption text-grey">
                ≈ {{ (amount / currentPrice).toFixed(5) }} TON
              </div>
            </template>
          </v-text-field>
        </v-col>
        <v-col cols="6">
          <div class="text-h6 text-white">
            ${{ currentPrice.toFixed(4) ?? '--' }}
          </div>
        </v-col>
      </v-row>
      <v-row class="mt-4">
        <v-col cols="6">
          <v-btn
            block
            size="large"
            color="green"
            :loading="loading || walletStore.isFetchingBalances"
            @click="executeTrade('buy')"
            :disabled="!canTrade('buy')"
          >
            {{ $t('buy') }}
          </v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn
            block
            size="large"
            color="red"
            :loading="loading || walletStore.isFetchingBalances"
            @click="executeTrade('sell')"
            :disabled="!canTrade('sell')"
          >
            {{ $t('sell') }}
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMarketStore } from '@/stores/market';
import { useTradingStore } from '@/stores/trading';
import { useWalletStore } from '@/stores/wallet';
import { useErrorStore } from '@/stores/error';
import { useDebounceFn } from '@vueuse/core';
import { validateAmount } from '@/utils/validators';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const amount = ref(0.1);
const marketStore = useMarketStore();
const tradingStore = useTradingStore();
const walletStore = useWalletStore();
const errorStore = useErrorStore();
const loading = ref(false);

const currentPrice = computed(() => {
  console.log('[TradeButtons] Current price:', marketStore.currentPrice);
  return marketStore.currentPrice || 0;
});

const amountRules = computed(() => [
  (v) => validateAmount(v, Infinity, 0.01) === true || t('error.invalid_amount'),
  (v) => !currentPrice.value || (v / currentPrice.value) <= walletStore.balance || t('error.insufficient_ton_balance'),
  (v) => v <= walletStore.usdt_balance || t('error.insufficient_usdt_balance'),
]);

const canTrade = (type) => {
  const isValidAmount = validateAmount(amount.value, Infinity, 0.01) === true;
  if (!currentPrice.value) {
    console.log('[TradeButtons] Cannot trade: no current price');
    return false;
  }
  if (type === 'buy') {
    const tonRequired = amount.value / currentPrice.value;
    const canBuy = isValidAmount && tonRequired <= walletStore.balance;
    console.log('[TradeButtons] Can buy:', { isValidAmount, tonRequired, balance: walletStore.balance, canBuy });
    return canBuy;
  }
  const canSell = isValidAmount && amount.value <= walletStore.udt_balance;
  console.log('[TradeButtons] Can sell:', { isValidAmount, amount: amount.value, usdtBalance: walletStore.usdt_balance, canSell });
  return canSell;
};

const executeTrade = useDebounceFn(async (type) => {
  console.log(`[TradeButtons] Executing ${type} trade: ${amount.value} USD for TON-USDT`);
  loading.value = true;
  try {
    await tradingStore.executeTrade(type, amount.value, 'TON-USDT');
    errorStore.setError(t('trade_executed'), false);
    amount.value = 0.1;
  } catch (error) {
    console.error('[TradeButtons] Trade execution failed:', error);
    errorStore.setError(t('error.failed_to_execute_trade'));
  } finally {
    loading.value = false;
  }
}, 300);

onMounted(async () => {
  console.log('[TradeButtons] Mounted, fetching balances');
  walletStore.syncFromAuthStore();
  try {
    await walletStore.fetchBalances();
  } catch (error) {
    console.error('[TradeButtons] Failed to fetch balances on mount:', error);
  }
});
</script>

<style scoped>
.v-text-field {
  border-radius: 8px;
}

.v-text-field :deep(.v-field__outline) {
  border-radius: 8px;
}

.v-btn {
  border-radius: 8px;
}
</style>
