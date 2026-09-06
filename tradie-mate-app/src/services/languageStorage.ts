import { MMKV } from 'react-native-mmkv'

const languageStorage = new MMKV({
  id: 'app-preferences',
})

export const LanguageStorage = {
  getLanguage: (): string | null => {
    return languageStorage.getString('language') ?? null
  },

  setLanguage: (language: string): void => {
    languageStorage.set('language', language)
  },

  clearLanguage: (): void => {
    languageStorage.delete('language')
  },
}
