export type Locale = 'uk' | 'ru' | 'en'

export const LOCALE_LABELS: Record<Locale, string> = {
  uk: '🇺🇦 Українська',
  ru: '🇷🇺 Русский',
  en: '🇬🇧 English',
}

export const LOCALES: Locale[] = ['uk', 'ru', 'en']

export const DEFAULT_LOCALE: Locale = 'uk'