import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-plugin-vue-svg'
import { resolve } from 'path'
import path from 'path'

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
      include: ['vue', 'vue-router', 'pinia', 'axios', '@twa-dev/sdk', 'vuetify', 'lightweight-charts', '@ton/core'],
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
      external: ['@telegram-apps/analytics', '@ton/crypto'],
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
