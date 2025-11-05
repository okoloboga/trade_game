import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-plugin-vue-svg'
import { resolve } from 'path'
import path from 'path'
import { Buffer } from 'buffer'

// Плагин для создания виртуального модуля @ton/crypto
const tonCryptoPolyfillPlugin = () => {
  return {
    name: 'ton-crypto-polyfill',
    resolveId(id) {
      if (id === '@ton/crypto') {
        return '\0@ton/crypto'
      }
    },
    load(id) {
      if (id === '\0@ton/crypto') {
        // Используем crypto-js для синхронного SHA-256 в браузере
        return `
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

// sha256_sync использует crypto-js для синхронного вычисления SHA-256 хеша в браузере
export const sha256_sync = (data) => {
  // Преобразуем данные в формат, который понимает crypto-js
  let wordArray;
  
  if (data instanceof Buffer) {
    wordArray = CryptoJS.enc.Hex.parse(data.toString('hex'));
  } else if (data instanceof Uint8Array) {
    const hex = Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    wordArray = CryptoJS.enc.Hex.parse(hex);
  } else if (typeof data === 'string') {
    wordArray = CryptoJS.enc.Utf8.parse(data);
  } else if (data instanceof ArrayBuffer) {
    const uint8Array = new Uint8Array(data);
    const hex = Array.from(uint8Array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    wordArray = CryptoJS.enc.Hex.parse(hex);
  } else {
    wordArray = data;
  }
  
  // Вычисляем SHA-256 хеш синхронно
  const hash = CryptoJS.SHA256(wordArray);
  
  // Преобразуем результат в Buffer
  const hashHex = hash.toString(CryptoJS.enc.Hex);
  return Buffer.from(hashHex, 'hex');
};

export const mnemonicToWalletKey = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const mnemonicToSeed = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const keyPairFromSeed = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const keyPairFromSecretKey = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const sign = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const verifySignature = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const encrypt = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export const decrypt = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};
export default {
  sha256_sync,
  mnemonicToWalletKey,
  mnemonicToSeed,
  keyPairFromSeed,
  keyPairFromSecretKey,
  sign,
  verifySignature,
  encrypt,
  decrypt,
};
        `
      }
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    vue({
      reactivityTransform: true,
    }),
    vuetify({
      autoImport: true,
    }),
    svgLoader(),
    tonCryptoPolyfillPlugin(), // Добавляем плагин для полифила @ton/crypto
  ],
  define: {
    global: {
      Buffer: Buffer,
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
    allowedHosts: ["https://447c-91-199-154-233.ngrok-free.app"],
    fs: {
      strict: false,
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'axios', '@twa-dev/sdk', 'vuetify', 'lightweight-charts', 'buffer', 'crypto-js'],
      esbuildOptions: {
        alias: {
          '@ton/crypto': path.resolve(__dirname, 'src/utils/ton-crypto-polyfill.js'),
        },
      },
    },
  },
  build: {
    sourcemap: true,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vuetify: ['vuetify'],
          tonconnect: ['@tonconnect/sdk'],
          charts: ['lightweight-charts'],
          vendor: ['vue', 'vue-router', 'pinia', 'axios', '@twa-dev/sdk'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue-demi': path.resolve(__dirname, 'node_modules/vue-demi/lib/index.mjs'),
      'vuetify/lib': 'vuetify',
      'vuetify/styles': 'vuetify/styles',
      buffer: 'buffer',
      // Полифил для @ton/crypto - модуль для Node.js, не нужен в браузере
      '@ton/crypto': path.resolve(__dirname, 'src/utils/ton-crypto-polyfill.js'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "vuetify/styles";`,
      },
    },
  },
  esbuild: {
    logOverride: {
      'slot-outside-render': 'silent'
    },
  },
})
