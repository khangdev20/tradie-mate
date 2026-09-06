import { createLanguageStore } from '../../src/store/language.store'

describe('createLanguageStore', () => {
  it('sets a language, persists it, and asks i18next to change', () => {
    const changeLanguage = jest.fn()
    const storage = {
      setLanguage: jest.fn(),
      clearLanguage: jest.fn(),
      getLanguage: jest.fn(() => null),
    }
    const fakeI18n = {
      language: 'en-AU',
      changeLanguage,
    }

    const store = createLanguageStore(
      fakeI18n as any,
      storage as any,
      () => 'en-AU',
    )

    store.getState().setLanguage('zh-Hans')

    expect(store.getState().language).toBe('zh-Hans')
    expect(storage.setLanguage).toHaveBeenCalledWith('zh-Hans')
    expect(changeLanguage).toHaveBeenCalledWith('zh-Hans')
  })

  it('resets to the default language and clears persistence', () => {
    const changeLanguage = jest.fn()
    const storage = {
      setLanguage: jest.fn(),
      clearLanguage: jest.fn(),
      getLanguage: jest.fn(() => null),
    }
    const fakeI18n = {
      language: 'zh-Hans',
      changeLanguage,
    }

    const store = createLanguageStore(
      fakeI18n as any,
      storage as any,
      () => 'en-AU',
    )

    store.getState().resetLanguage()

    expect(store.getState().language).toBe('en-AU')
    expect(storage.clearLanguage).toHaveBeenCalled()
    expect(changeLanguage).toHaveBeenCalledWith('en-AU')
  })

  it('resets to the resolved device language when available', () => {
    const changeLanguage = jest.fn()
    const storage = {
      setLanguage: jest.fn(),
      clearLanguage: jest.fn(),
      getLanguage: jest.fn(() => null),
    }
    const fakeI18n = {
      language: 'en-AU',
      changeLanguage,
    }

    const store = createLanguageStore(
      fakeI18n as any,
      storage as any,
      () => 'zh-Hans',
    )

    store.getState().resetLanguage()

    expect(store.getState().language).toBe('zh-Hans')
    expect(changeLanguage).toHaveBeenCalledWith('zh-Hans')
  })
})
