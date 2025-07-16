import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

export function useLanguage() {
  const { locale } = useI18n();
  const language = ref('en'); // Английский по умолчанию

  const changeLanguage = (newLanguage) => {
    if (['en', 'ru'].includes(newLanguage)) {
      language.value = newLanguage;
      locale.value = newLanguage;
      localStorage.setItem('language', newLanguage);
    } else {
      console.warn(`[useLanguage] Unsupported language: ${newLanguage}, falling back to 'en'`);
      language.value = 'en';
      locale.value = 'en';
      localStorage.setItem('language', 'en');
    }
  };

  // Проверяем язык Telegram, если доступен
  const telegramLanguage = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (telegramLanguage && ['en', 'ru'].includes(telegramLanguage)) {
    changeLanguage(telegramLanguage);
  } else {
    // Проверяем сохранённый язык, если Telegram не предоставил поддерживаемый язык
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && ['en', 'ru'].includes(savedLanguage)) {
      changeLanguage(savedLanguage);
    } else {
      // Фallback на английский
      changeLanguage('en');
    }
  }

  return { language, changeLanguage };
}
