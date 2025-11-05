import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-plugin-vue-svg'
import { resolve } from 'path'
import path from 'path'

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

// Плагин для глобальной инжекции Buffer
const bufferPolyfillPlugin = () => {
  const bufferInjected = new Set()
  return {
    name: 'buffer-polyfill',
    resolveId(id) {
      // Убеждаемся, что buffer правильно резолвится
      if (id === 'buffer') {
        return null // Позволяем Vite использовать resolve.alias
      }
    },
    transform(code, id) {
      // Исключаем сам модуль buffer из обработки
      if (id.includes('node_modules/buffer/') || id.includes('node_modules/buffer/index')) {
        return null
      }
      
      // Обрабатываем CommonJS require('buffer') и преобразуем в ES модуль
      let modified = false
      if (code.includes("require('buffer')") || code.includes('require("buffer")')) {
        // Заменяем require('buffer') на Buffer через import
        code = code.replace(/require\(['"]buffer['"]\)/g, "Buffer")
        code = `import { Buffer } from 'buffer';\n${code}`
        modified = true
      }
      
      // Пропускаем, если Buffer уже импортирован или объявлен в коде
      if (!modified && (code.includes('import { Buffer }') || code.includes('import Buffer') || code.includes('export.*Buffer') || code.includes('const Buffer') || code.includes('var Buffer') || code.includes('let Buffer'))) {
        return null
      }
      
      // Инжектируем Buffer только в модули node_modules, которые используют Buffer
      // Особенно важно для @ton модулей
      const isNodeModule = id.includes('node_modules')
      const isTonModule = id.includes('@ton')
      const usesBuffer = code.includes('Buffer') && !code.includes('import { Buffer }')
      
      if (isNodeModule && (isTonModule || usesBuffer || modified) && !bufferInjected.has(id)) {
        bufferInjected.add(id)
        // Если код уже был модифицирован (require заменен), добавляем только глобальную инициализацию
        if (modified) {
          return {
            code: `${code}
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
  window.global = window.global || window;
  window.global.Buffer = Buffer;
}
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
if (typeof global !== 'undefined' && !global.Buffer) {
  global.Buffer = Buffer;
}
            `,
            map: null,
          }
        } else {
          return {
            code: `
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
  window.global = window.global || window;
  window.global.Buffer = Buffer;
}
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
if (typeof global !== 'undefined' && !global.Buffer) {
  global.Buffer = Buffer;
}
${code}
            `,
            map: null,
          }
        }
      }
      
      // Если код был модифицирован, возвращаем его
      if (modified) {
        return {
          code,
          map: null,
        }
      }
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [
    bufferPolyfillPlugin(), // Добавляем плагин для Buffer глобально (первым!)
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
    global: 'globalThis',
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
      include: ['vue', 'vue-router', 'pinia', 'axios', '@twa-dev/sdk', 'vuetify', 'lightweight-charts', '@ton/core', 'buffer'],
      esbuildOptions: {
        alias: {
          '@ton/crypto': path.resolve(__dirname, 'src/utils/ton-crypto-polyfill.js'),
        },
        define: {
          'global': 'globalThis',
        },
      },
    },
  },
  build: {
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: ['@telegram-apps/analytics'],
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
