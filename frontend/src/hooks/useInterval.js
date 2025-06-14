import { onUnmounted } from 'vue';

export default function useInterval(callback, delay) {
  console.log('[useInterval] Setting up interval with delay:', delay);
  const intervalId = setInterval(callback, delay);
  const stop = () => {
    console.log('[useInterval] Stopping interval');
    clearInterval(intervalId);
  };
  onUnmounted(stop);
  return stop;
}
