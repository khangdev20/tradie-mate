import {
  DEFAULT_LOCALE,
  resolveInitialLocale,
  SUPPORTED_LOCALES,
} from '../../src/i18n/locale'

describe('resolveInitialLocale', () => {
  it('returns a valid saved locale first', () => {
    expect(resolveInitialLocale('zh-Hans', ['en-US'])).toBe('zh-Hans')
  })

  it('ignores an invalid saved locale and falls back to a supported device locale', () => {
    expect(resolveInitialLocale('fr-FR', ['en-AU'])).toBe('en-AU')
  })

  it('maps zh-Hans-CN to the supported zh-Hans locale', () => {
    expect(resolveInitialLocale(null, ['zh-Hans-CN'])).toBe('zh-Hans')
  })

  it('maps any English device locale to en-AU', () => {
    expect(resolveInitialLocale(null, ['en-US'])).toBe('en-AU')
  })

  it('falls back to the default locale when no saved or device locale is supported', () => {
    expect(resolveInitialLocale(null, ['fr-FR', 'de-DE'])).toBe(DEFAULT_LOCALE)
  })

  it('exposes only the agreed supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en-AU', 'zh-Hans'])
  })
})
