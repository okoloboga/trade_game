<template>
  <div class="chart-container">
    <div ref="chartContainer" class="chart"></div>
    <v-progress-circular
      v-if="marketStore.isLoading"
      indeterminate
      color="primary"
      class="chart-loading"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { createChart } from 'lightweight-charts'
import { useMarketStore } from '@/stores/market'
import { useErrorStore } from '@/stores/error'

const chartContainer = ref(null)
const marketStore = useMarketStore()
const errorStore = useErrorStore()
let chart = null
let candleSeries = null

onMounted(async () => {
  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: 300,
    layout: {
      background: { color: '#000000' },
      textColor: '#ffffff',
    },
    grid: {
      vertLines: { color: '#333333' },
      horzLines: { color: '#333333' },
    },
    timeScale: {
      borderColor: '#485c7b',
    },
  })

  candleSeries = chart.addCandlestickSeries({
    upColor: '#4caf50',
    downColor: '#f44336',
    borderVisible: false,
    wickUpColor: '#4caf50',
    wickDownColor: '#f44336',
  })

  try {
    await marketStore.fetchCandles()
    updateChart()
    marketStore.startRealTimeUpdates()
  } catch (error) {
    errorStore.setError('Failed to load chart data')
  }

  const resizeObserver = new ResizeObserver(() => {
    chart.resize(chartContainer.value.clientWidth, 300)
  })
  resizeObserver.observe(chartContainer.value)
})

const updateChart = () => {
  if (candleSeries && marketStore.candles.length > 0) {
    const formattedCandles = marketStore.candles.map(candle => ({
      time: Math.floor(candle.timestamp / 1000), // Convert ms to seconds
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }))
    candleSeries.setData(formattedCandles)
  }
}

watch(() => marketStore.candles, updateChart, { deep: true })

onUnmounted(() => {
  marketStore.stopRealTimeUpdates()
  if (chart) chart.remove()
})
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
}
.chart {
  width: 100%;
  height: 100%;
}
.chart-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
