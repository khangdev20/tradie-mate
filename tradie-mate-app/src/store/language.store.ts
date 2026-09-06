import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { getLocales } from 'react-native-localize'
import { resolveInitialLocale, SupportedLocale } from '../i18n/locale'
import { LanguageStorage } from '../services/languageStorage'
import { i18n } from '../i18n'

type LanguageStore = {
  language: SupportedLocale
  setLanguage: (language: SupportedLocale) => void
  resetLanguage: () => void
}

type LanguageChangeService = {
  language: string
  changeLanguage: (language: string) => Promise<unknown> | unknown
}

type LanguagePersistence = {
  setLanguage: (language: string) => void
  clearLanguage: () => void
  getLanguage: () => string | null
}

export function createLanguageStore(
  changeService: LanguageChangeService,
  persistence: LanguagePersistence,
  resolveDeviceLanguage: () => SupportedLocale,
): UseBoundStore<StoreApi<LanguageStore>> {
  const initialLanguage = changeService.language as SupportedLocale

  return create<LanguageStore>((set) => ({
    language: initialLanguage,
    setLanguage: (language) => {
      persistence.setLanguage(language)
      changeService.changeLanguage(language)
      set({ language })
    },
    resetLanguage: () => {
      const deviceLanguage = resolveDeviceLanguage()
      persistence.clearLanguage()
      changeService.changeLanguage(deviceLanguage)
      set({ language: deviceLanguage })
    },
  }))
}

export const useLanguageStore = createLanguageStore(
  i18n,
  LanguageStorage,
  () => resolveInitialLocale(null, getLocales().map((locale) => locale.languageTag)),
)
