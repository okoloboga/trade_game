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
    // Добавляем для корректной загрузки модулей
    fs: {
      strict: false,
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'axios', '@twa-dev/sdk', 'vuetify', 'lightweight-charts'],
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
    },
  },
  css: {
    // Явная загрузка CSS Vuetify
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
