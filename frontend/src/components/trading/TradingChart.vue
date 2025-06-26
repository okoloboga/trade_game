<template>
  <div class="trading-chart-wrapper">
    <v-tabs
      v-model="timeframe"
      color="primary"
      class="mb-2 timeframe-tabs"
      grow
      @update:modelValue="changeTimeframe"
    >
      <v-tab v-for="tf in timeframes" :key="tf" :value="tf">
        {{ tf }}
      </v-tab>
    </v-tabs>
    <div class="chart-container">
      <div ref="chartContainer" class="chart"></div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="marketStore.isLoading" class="loading">
        <v-progress-circular indeterminate />
        <div class="mt-2">{{ $t('loading_chart') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * TradingChart component displays a candlestick chart for market data using Lightweight Charts.
 * Ensures the right edge (price scale and latest candles) is visible on mobile devices.
 */

import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { createChart } from 'lightweight-charts';
import { useMarketStore } from '@/stores/market';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const marketStore = useMarketStore();
const chartContainer = ref(null);
const error = ref('');
const timeframe = ref(marketStore.timeframe);
const timeframes = ['1m', '5m', '15m'];
let chart = null;
let candleSeries = null;

/**
 * Initializes the candlestick chart with Lightweight Charts.
 * Configures the chart to focus on the right edge for mobile devices.
 */
const initChart = async () => {
  try {
    error.value = '';
    if (!chartContainer.value) {
      throw new Error('Chart container not found');
    }

    await nextTick();
    const rect = chartContainer.value.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      throw new Error('Container has zero dimensions');
    }

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
      rightPriceScale: {
        visible: true,
        borderVisible: true,
        borderColor: '#333333',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#f44336',
      borderVisible: false,
      wickUpColor: '#4caf50',
      wickDownColor: '#f44336',
    });

    const handleResize = () => {
      if (chart && chartContainer.value) {
        const newRect = chartContainer.value.getBoundingClientRect();
        chart.applyOptions({
          width: Math.max(400, newRect.width),
          height: 300,
        });
        // Ensure right edge is visible on mobile
        if (newRect.width < 600) {
          chart.timeScale().scrollToRealTime();
        }
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

    // Focus on the right edge for mobile devices
    if (rect.width < 600) {
      chart.timeScale().scrollToRealTime();
    }
  } catch (err) {
    error.value = `Chart error: ${err.message}`;
  }
};

/**
 * Updates the chart with candlestick data from the market store.
 */
const updateChartData = () => {
  if (!candleSeries || !chart) {
    error.value = t('chart_not_initialized');
    return;
  }

  try {
    if (!marketStore.candles || marketStore.candles.length === 0) {
      error.value = t('no_data_available');
      return;
    }

    const chartData = marketStore.candles
      .filter(candle => {
        if (!candle || candle.timestamp === undefined ||
            candle.open === undefined || candle.high === undefined ||
            candle.low === undefined || candle.close === undefined) {
          return false;
        }
        if (isNaN(Number(candle.open)) || isNaN(Number(candle.high)) ||
            isNaN(Number(candle.low)) || isNaN(Number(candle.close))) {
          return false;
        }
        if (Number(candle.high) < Number(candle.low)) {
          return false;
        }
        return true;
      })
      .map(candle => ({
        time: Math.floor(candle.timestamp / 1000),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      }))
      .sort((a, b) => a.time - b.time);

    if (chartData.length === 0) {
      error.value = t('invalid_data');
      return;
    }

    candleSeries.setData(chartData);
    // Focus on the right edge for mobile devices
    if (chartContainer.value?.getBoundingClientRect().width < 600) {
      chart.timeScale().scrollToRealTime();
    } else {
      chart.timeScale().fitContent();
    }
    error.value = '';
  } catch (err) {
    error.value = `Chart update error: ${err.message}`;
  }
};

/**
 * Changes the timeframe and fetches new candlestick data.
 * @param tf - The selected timeframe (e.g., '1m', '5m', '15m').
 */
const changeTimeframe = async (tf) => {
  try {
    timeframe.value = tf;
    marketStore.setTimeframe(tf);
    await marketStore.fetchCandles('TON-USDT', tf);
    updateChartData();
  } catch (err) {
    error.value = `Failed to load ${tf} candles: ${err.message}`;
  }
};

watch(
  () => marketStore.candles,
  () => {
    if (!chart || !candleSeries) return;
    updateChartData();
  },
  { deep: true }
);

watch(
  () => marketStore.currentPrice,
  (newPrice) => {
    if (!candleSeries || !newPrice || marketStore.candles.length === 0) return;
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
    error.value = `Chart error: ${err.message}`;
  }
});

onUnmounted(() => {
  marketStore.stopRealTimeUpdates();
});
</script>

<style scoped>
.trading-chart-wrapper {
  width: 100%;
  overflow-x: auto;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
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

.timeframe-tabs {
  background: transparent;
}

.timeframe-buttons {
  display: flex;
  justify-content: space-between;
}

.timeframe-buttons .v-btn {
  flex: 1;
  margin: 0 2px;
}

@media (max-width: 600px) {
  .trading-chart-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .chart-container {
    min-width: 400px; /* Ensure price scale is visible */
  }
}
</style>
