<template>
  <div class="chart-container">
    <v-tabs
      v-model="timeframe"
      color="primary"
      class="mb-4"
      @update:modelValue="changeTimeframe"
    >
      <v-tab v-for="tf in timeframes" :key="tf" :value="tf">
        {{ tf }}
      </v-tab>
    </v-tabs>
    <div ref="chartContainer" class="chart"></div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="marketStore.isLoading" class="loading">
      <v-progress-circular indeterminate />
      <div class="mt-2">{{ $t('loading_chart') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { createChart } from 'lightweight-charts';
import { useMarketStore } from '@/stores/market';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const marketStore = useMarketStore();
const chartContainer = ref(null);
const error = ref('');
const timeframe = ref(marketStore.timeframe); // Синхронизируем с marketStore
const timeframes = ['1m', '5m', '15m'];
let chart = null;
let candleSeries = null;

const initChart = async () => {
  try {
    console.log('[TradingChart] Starting chart initialization');
    error.value = '';
    if (!chartContainer.value) {
      throw new Error('Chart container not found');
    }

    await nextTick();
    const rect = chartContainer.value.getBoundingClientRect();
    console.log('[TradingChart] Container rect:', rect);
    if (rect.width === 0 || rect.height === 0) {
      throw new Error('Container has zero dimensions');
    }
    console.log('[TradingChart] Creating chart...');
    if (chart) {
      chart.remove();
      chart = null;
      candleSeries = null;
    }

    chart = createChart(chartContainer.value, {
      width: Math.max(400, rect.width),
      height: 300,
      layout: {
        background: { type: 'solid', color: '#000000' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#333333' },
        horzLines: { color: '#333333' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#f44336',
      borderVisible: false,
      wickUpColor: '#4caf50',
      wickDownColor: '#f44336',
    });
    console.log('[TradingChart] Candlestick series added successfully');

    const handleResize = () => {
      if (chart && chartContainer.value) {
        const newRect = chartContainer.value.getBoundingClientRect();
        chart.applyOptions({
          width: Math.max(400, newRect.width),
          height: 300,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
        chart = null;
        candleSeries = null;
      }
    });

    chart.timeScale().fitContent();
    console.log('[TradingChart] Chart initialized successfully');
  } catch (err) {
    console.error('[TradingChart] Chart initialization error:', err);
    error.value = `Chart error: ${err.message}`;
  }
};

const updateChartData = () => {
  if (!candleSeries || !chart) {
    console.warn('[TradingChart] Cannot update chart data: chart or series not initialized');
    return;
  }

  try {
    if (!marketStore.candles || marketStore.candles.length === 0) {
      console.log('[TradingChart] No data available for chart');
      error.value = t('no_data_available');
      return;
    }

    const chartData = marketStore.candles
      .filter(candle => {
        if (!candle || candle.timestamp === undefined ||
            candle.open === undefined || candle.high === undefined ||
            candle.low === undefined || candle.close === undefined) {
          console.warn('[TradingChart] Skipping invalid candle (missing fields):', candle);
          return false;
        }
        if (isNaN(Number(candle.open)) || isNaN(Number(candle.high)) ||
            isNaN(Number(candle.low)) || isNaN(Number(candle.close))) {
          console.warn('[TradingChart] Skipping candle with non-numeric values:', candle);
          return false;
        }
        if (Number(candle.high) < Number(candle.low)) {
          console.warn('[TradingChart] Skipping candle with high < low:', candle);
          return false;
        }
        return true;
      })
      .map(candle => {
        return {
          time: Math.floor(candle.timestamp / 1000),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        };
      })
      .sort((a, b) => a.time - b.time);

    if (chartData.length === 0) {
      console.warn('[TradingChart] No valid candles after filtering');
      error.value = t('invalid_data');
      return;
    }

    console.log('[TradingChart] Chart data (first 3):', chartData.slice(0, 3));
    candleSeries.setData(chartData);
    chart.timeScale().fitContent();
    error.value = '';
    console.log('[TradingChart] Chart data updated successfully');
  } catch (err) {
    console.error('[TradingChart] Error updating chart data:', err);
    error.value = `Chart update error: ${err.message}`;
  }
};

const changeTimeframe = async (tf) => {
  console.log(`[TradingChart] Changing timeframe to: ${tf}`);
  try {
    timeframe.value = tf;
    marketStore.setTimeframe(tf);
    await marketStore.fetchCandles('TON-USDT', tf);
    updateChartData();
  } catch (err) {
    console.error('[TradingChart] Error changing timeframe:', err);
    error.value = `Failed to load ${tf} candles: ${err.message}`;
  }
};

watch(
  () => marketStore.candles,
  (newCandles) => {
    if (!chart || !candleSeries) {
      console.log('[TradingChart] Skipping chart update: chart not initialized');
      return;
    }
    updateChartData();
  },
  { deep: true }
);

watch(
  () => marketStore.currentPrice,
  (newPrice) => {
    if (!candleSeries || !newPrice || marketStore.candles.length === 0) return;
    console.log('[TradingChart] Current price updated:', newPrice);

    const lastCandle = marketStore.candles[marketStore.candles.length - 1];
    const updatedCandle = {
      time: Math.floor(lastCandle.timestamp / 1000),
      open: Number(lastCandle.open),
      high: Math.max(Number(lastCandle.high), newPrice),
      low: Math.min(Number(lastCandle.low), newPrice),
      close: newPrice,
    };

    candleSeries.update(updatedCandle);
  }
);

onMounted(async () => {
  try {
    await nextTick();
    await initChart();
    await marketStore.fetchCandles();
    await marketStore.fetchCurrentPrice();
    marketStore.startRealTimeUpdates();
  } catch (err) {
    console.error('[TradingChart] onMounted error:', err);
    error.value = `Chart error: ${err.message}`;
  }
});

onUnmounted(() => {
  console.log('[TradingChart] onUnmounted: Stopping real-time updates');
  marketStore.stopRealTimeUpdates();
});
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.chart {
  width: 100%;
  height: 300px;
}
.error {
  color: red;
  text-align: center;
  margin-top: 10px;
}
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
</style>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2)

}

.chart {
  width: 100%;
  height: 100%;
}

.error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #f44336;
  text-align: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  z-index: 10;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ffffff;
  text-align: center;
  z-index: 5;
}

.timeframe-buttons {
  display: flex;
  justify-content: space-between;
}

.timeframe-buttons .v-btn {
  flex: 1;
  margin: 0 2px;
}
</style>
