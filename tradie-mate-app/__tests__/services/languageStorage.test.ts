import { LanguageStorage } from '../../src/services/languageStorage'

describe('LanguageStorage', () => {
  beforeEach(() => {
    LanguageStorage.clearLanguage()
  })

  it('persists and returns the selected language', () => {
    LanguageStorage.setLanguage('zh-Hans')

    expect(LanguageStorage.getLanguage()).toBe('zh-Hans')
  })

  it('returns null when no language has been saved', () => {
    expect(LanguageStorage.getLanguage()).toBeNull()
  })

  it('clears a saved language', () => {
    LanguageStorage.setLanguage('en-AU')
    LanguageStorage.clearLanguage()

    expect(LanguageStorage.getLanguage()).toBeNull()
  })
})
