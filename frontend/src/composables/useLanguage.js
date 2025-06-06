import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

export function useLanguage() {
  const { locale } = useI18n()
  const language = ref(locale.value)

  const changeLanguage = (newLanguage) => {
    language.value = newLanguage
    locale.value = newLanguage
    // Можно сохранить язык в localStorage
    localStorage.setItem('language', newLanguage)
  }

  // Загрузка сохранённого языка
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage) {
    changeLanguage(savedLanguage)
  }

  return { language, changeLanguage }
}
