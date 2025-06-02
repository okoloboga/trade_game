import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          background: '#000000', // Чёрный фон для минималистичного дизайна
          primary: '#4CAF50', // Зелёный для Buy/Long
          error: '#F44336', // Красный для Sell/Short
          text: '#FFFFFF', // Белый текст
        },
      },
    },
  },
  defaults: {
    VBtn: {
      variant: 'flat',
      density: 'comfortable',
    },
    VTextField: {
      variant: 'outlined',
      color: 'primary',
    },
  },
})
