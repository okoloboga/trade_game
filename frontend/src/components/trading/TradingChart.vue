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

    if (rect.width === 0 || rect.height === 0) {
      throw new Error('Container has zero dimensions')
    }

    // Если график уже существует, удалим его
    if (chart) {
      chart.remove()
      chart = null
      candleSeries = null
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
    })

    candleSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#f44336',
      borderVisible: false,
      wickUpColor: '#4caf50',
      wickDownColor: '#f44336',
    })
    console.log('Candlestick series added successfully')

    // Добавим обработчик ресайза
    const handleResize = () => {
      if (chart && chartContainer.value) {
        const newRect = chartContainer.value.getBoundingClientRect()
        chart.applyOptions({
          width: Math.max(400, newRect.width),
          height: 300
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // Очистка при размонтировании
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (chart) {
        chart.remove()
        chart = null
        candleSeries = null
      }
    })

    updateChartData()

    chart.timeScale().fitContent()
    console.log('Chart initialized successfully')
  } catch (err) {
    console.error('Chart initialization error:', err)
    error.value = `Chart error: ${err.message}`
  }
}

const updateChartData = () => {
  if (!candleSeries || !chart) {
    console.warn('Cannot update chart data: chart or series not initialized')
    return
  }

  try {

    if (!marketStore.candles || marketStore.candles.length === 0) {
      console.log('No data available for chart')
      return
    }

    // Проверяем и преобразуем данные
    const chartData = marketStore.candles
      .filter(candle => {
        // Проверяем наличие всех необходимых полей
        if (!candle || candle.timestamp === undefined ||
            candle.open === undefined || candle.high === undefined ||
            candle.low === undefined || candle.close === undefined) {
          console.warn('Skipping invalid candle (missing fields):', candle)
          return false
        }

        // Проверяем, что все значения - числа
        if (isNaN(Number(candle.open)) || isNaN(Number(candle.high)) ||
            isNaN(Number(candle.low)) || isNaN(Number(candle.close))) {
          console.warn('Skipping candle with non-numeric values:', candle)
          return false
        }

        // Проверяем логику high/low
        if (Number(candle.high) < Number(candle.low)) {
          console.warn('Skipping candle with high < low:', candle)
          return false
        }

        return true
      })
      .map(candle => {
        // Преобразуем timestamp из миллисекунд в секунды
        const timeInSeconds = Math.floor(candle.timestamp / 1000)

        // Преобразуем все значения в числа
        return {
          time: timeInSeconds,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close)
        }
      })
      .sort((a, b) => a.time - b.time) // Сортируем по времени, чтобы убедиться в правильном порядке

    if (chartData.length === 0) {
      console.warn('No valid candles after filtering')
      return
    }

    // Устанавливаем данные в график
    candleSeries.setData(chartData)

    // Масштабируем график, чтобы видеть все данные
    chart.timeScale().fitContent()

    console.log('Chart data updated successfully')
  } catch (err) {
    console.error('Error updating chart data:', err)
    error.value = `Chart update error: ${err.message}`
  }
}

watch(
  () => marketStore.candles,
  (newCandles) => {
    console.log('Market data updated, refreshing chart');
    updateChartData();
  },
  { deep: true }
);

// Для обновления последней свечи в реальном времени
watch(
  () => marketStore.currentPrice,
  (newPrice) => {
    if (!candleSeries || !newPrice || marketStore.candles.length === 0) return;

    console.log('Current price updated:', newPrice);

    // Получаем последнюю свечу
    const lastCandle = marketStore.candles[marketStore.candles.length - 1];

    // Обновляем последнюю свечу с новой ценой закрытия
    const updatedCandle = {
      time: Math.floor(lastCandle.timestamp / 1000),
      open: lastCandle.open,
      high: Math.max(lastCandle.high, newPrice),
      low: Math.min(lastCandle.low, newPrice),
      close: newPrice
    };

    // Обновляем последнюю свечу на графике
    candleSeries.update(updatedCandle);
  }
);

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
</style>
