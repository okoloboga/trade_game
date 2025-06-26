import { createApp } from 'vue';
import App from './App.vue';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { createPinia } from 'pinia';
import { router } from './router';
import WebApp from '@twa-dev/sdk';
import { createI18n } from 'vue-i18n';
import { Buffer } from 'buffer';
import apiService from '@/services/api';
import { TonConnectUI } from '@townsquarelabs/ui-vue';

// Импорт переводов
import en from './locales/en.json';
import ru from './locales/ru.json';

// Telegram WebApp инициализация
if (window.Telegram?.WebApp?.isVersionAtLeast?.('6.0')) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
} else {
  console.warn('Telegram WebApp is not available');
}

if (!window.Telegram?.WebApp) {
  console.warn('Running outside Telegram, mocking WebApp');
  window.Telegram = {
    WebApp: {
      isVersionAtLeast: () => true,
      ready: () => console.log('Mock WebApp ready'),
      expand: () => console.log('Mock WebApp expand'),
      BackButton: {
        show: () => console.log('Mock BackButton show'),
        hide: () => console.log('Mock BackButton hide'),
        onClick: (callback) => console.log('Mock BackButton onClick', callback),
      },
    },
  };
}

window.Buffer = window.Buffer || Buffer;

// Инициализация TonConnect
const tonConnectUI = new TonConnectUI({
  manifestUrl: 'https://trade.ruble.website/tonconnect-manifest.json', // Замените на ваш манифест
  bridgeUrl: 'https://bridge.tonapi.io/bridge', // Явно указываем рабочий мост
});

// Vuetify инициализация
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          background: '#000000',
          surface: '#1e1e1e',
        },
      },
    },
  },
});

// Инициализация vue-i18n
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
  legacy: false,
});

// Создаем приложение
const app = createApp(App);
const pinia = createPinia();

// Подключаем плагины
app.use(pinia);
app.use(router);
app.use(vuetify);
app.use(i18n);
app.provide('tonConnectUI', tonConnectUI); // Предоставляем tonConnectUI для компонентов

// Монтируем приложение
app.mount('#app');

// Инициализация после монтирования
async function initializeApp() {
  try {
    const { useAppStore } = await import('./stores/app');
    const { useAuthStore } = await import('./stores/auth');
    const { useWalletStore } = await import('./stores/wallet');
    const appStore = useAppStore();
    const authStore = useAuthStore();
    const walletStore = useWalletStore();
    appStore.setLoading(true);

    if (authStore.token) {
      try {
        const response = await apiService.verifyToken(authStore.token);
        if (response.valid) {
          await authStore.init();
          if (authStore.isConnected) {
            await walletStore.fetchWalletData();
          }
        } else {
          authStore.logout();
        }
      } catch (error) {
        console.error('[main.js] Token verification failed:', error);
        authStore.logout();
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
    const { useAuthStore } = await import('./stores/auth');
    const authStore = useAuthStore();
    authStore.logout();
  } finally {
    const { useAppStore } = await import('./stores/app');
    const appStore = useAppStore();
    appStore.setLoading(false);
  }
}

initializeApp();
