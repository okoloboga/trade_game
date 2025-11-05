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
        return `
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
      include: ['vue', 'vue-router', 'pinia', 'axios', '@twa-dev/sdk', 'vuetify', 'lightweight-charts', 'buffer'],
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
