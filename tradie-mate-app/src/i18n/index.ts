import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'react-native-localize'
import { LanguageStorage } from '../services/languageStorage'
import { DEFAULT_LOCALE, resolveInitialLocale } from './locale'
import { resources } from './resources'

export function createI18nInstance() {
  const instance = i18next.createInstance()
  const savedLanguage = LanguageStorage.getLanguage()
  const deviceLocales = getLocales().map((locale) => locale.languageTag)
  const language = resolveInitialLocale(savedLanguage, deviceLocales)

  instance.use(initReactI18next)
  instance.init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: ['en-AU', 'zh-Hans'],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  })

  return instance
}

export const i18n = createI18nInstance()

export default i18n
