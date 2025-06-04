import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { resolve } from 'path'

export default defineConfig({
  base: '/trading-mini-app/', // PATH TO APP ON SERVER!!
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // BACKEND
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:3000', // WebSocket
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true, // Для анализа размера бандла
  },
  resolve: {
  alias: {
    '@': resolve(__dirname, 'src'),
  },
  }
})
