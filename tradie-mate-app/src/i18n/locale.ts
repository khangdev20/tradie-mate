export const SUPPORTED_LOCALES = ['en-AU', 'zh-Hans'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-AU'

function normalizeLanguageTag(locale: string): string {
  return locale.trim().replace('_', '-').toLowerCase()
}

function matchSupportedLocale(locale: string): SupportedLocale | null {
  const normalized = normalizeLanguageTag(locale)

  if (SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale
  }

  if (normalized.startsWith('zh')) {
    return 'zh-Hans'
  }

  if (normalized.startsWith('en')) {
    return 'en-AU'
  }

  return null
}

export function resolveInitialLocale(
  savedLocale: string | null | undefined,
  deviceLocales: readonly string[],
): SupportedLocale {
  const savedMatch = savedLocale
    ? matchSupportedLocale(savedLocale)
    : null

  if (savedMatch) {
    return savedMatch
  }

  for (const deviceLocale of deviceLocales) {
    const match = matchSupportedLocale(deviceLocale)
    if (match) {
      return match
    }
  }

  return DEFAULT_LOCALE
}
