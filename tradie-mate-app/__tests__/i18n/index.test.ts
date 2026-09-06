import { getLocales } from 'react-native-localize'
import { createI18nInstance } from '../../src/i18n'
import { LanguageStorage } from '../../src/services/languageStorage'

jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => []),
}))

const mockedGetLocales = getLocales as jest.Mock

describe('createI18nInstance', () => {
  beforeEach(() => {
    LanguageStorage.clearLanguage()
    mockedGetLocales.mockReturnValue([])
  })

  it('defaults to en-AU when no language has been saved or detected', async () => {
    const instance = createI18nInstance()

    expect(instance.language).toBe('en-AU')
    expect(instance.t('common:appName')).toBe('TradieMate')
  })

  it('uses a valid saved language over the device locale', async () => {
    LanguageStorage.setLanguage('zh-Hans')
    mockedGetLocales.mockReturnValue([{ languageTag: 'en-AU' }])

    const instance = createI18nInstance()

    expect(instance.language).toBe('zh-Hans')
  })
})
