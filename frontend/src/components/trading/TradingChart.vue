<template>
  <div class="chart-container">
    <div ref="chartContainer" class="chart"></div>
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="marketStore.isLoading" class="loading">
      <v-progress-circular indeterminate />
        <div class="mt-2">{{ $t('loading_chart') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { createChart } from 'lightweight-charts'
import { useMarketStore } from '@/stores/market'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const marketStore = useMarketStore()
const chartContainer = ref(null)
const error = ref('')
let chart = null
let candleSeries = null

const initChart = async () => {
  try {
    error.value = ''

    if (!chartContainer.value) {
      throw new Error('Chart container not found')
    }

    await nextTick()

    const rect = chartContainer.value.getBoundingClientRect()
    console.log('Container dimensions:', rect)

    if (rect.width === 0 || rect.height === 0) {
      throw new Error('Container has zero dimensions')
    }

    chart = createChart(chartContainer.value, {
      width: Math.max(400, rect.width),
      height: 300,
      layout: {
        background: { type: 'solid', color: '#1e1e1e' },
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
    })

    console.log('Chart created successfully')

    candleSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#f44336',
      borderVisible: false,
      wickUpColor: '#4caf50',
      wickDownColor: '#f44336',
    })
    console.log('Candlestick series added successfully')

    updateChartData()

    chart.timeScale().fitContent()
    console.log('Chart initialized successfully')
  } catch (err) {
    console.error('Chart initialization error:', err)
    error.value = `Chart error: ${err.message}`
  }
}

const updateChartData = () => {
  if (!candleSeries) return

  try {
    let chartData = marketStore.candles

    if (!chartData || chartData.length === 0) {
      console.log('No data from store, using test data')
      chartData = [
        { time: '2023-12-01', open: 100, high: 110, low: 95, close: 105 },
        { time: '2023-12-02', open: 105, high: 115, low: 100, close: 110 },
        { time: '2023-12-03', open: 110, high: 120, low: 105, close: 115 },
        { time: '2023-12-04', open: 115, high: 125, low: 110, close: 120 },
        { time: '2023-12-05', open: 120, high: 130, low: 115, close: 125 },
      ]
    }

    console.log('Updating chart with data:', chartData.length, 'candles')
    candleSeries.setData(chartData)

    if (chart) {
      chart.timeScale().fitContent()
    }
  } catch (err) {
    console.error('Error updating chart data:', err)
  }
}

watch(() => marketStore.candles, () => {
  console.log('Market data updated, refreshing chart')
  updateChartData()
}, { deep: true })

watch(() => marketStore.currentPrice, (newPrice) => {
  if (newPrice && candleSeries && marketStore.candles.length > 0) {
    console.log('Current price updated:', newPrice)
    const lastCandle = marketStore.candles[marketStore.candles.length - 1]
    candleSeries.update({
      time: Math.floor(Date.now() / 1000),
      open: lastCandle.open,
      high: Math.max(lastCandle.high, newPrice),
      low: Math.min(lastCandle.low, newPrice),
      close: newPrice,
    })
  }
})

onMounted(async () => {
  await nextTick()
  initChart()
})

onUnmounted(() => {
  if (chart) {
    chart.remove()
    chart = null
  }
  candleSeries = null
})
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
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
</style>
