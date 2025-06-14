import { onUnmounted } from 'vue';

export default function useInterval(callback, delay) {
  const intervalId = setInterval(callback, delay);
  onUnmounted(() => clearInterval(intervalId));
}
