import { useLocale } from './store'
import { DEFAULT_LOCALE, LOCALES, type Locale } from './config'
import uk, { type Messages } from './locales/uk'
import ru from './locales/ru'
import en from './locales/en'

const messages: Record<Locale, Messages> = { uk, ru, en }

export type { Messages, Locale }

// Resolve a nested key like "admin.sidebar.analytics" → string
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}`
        : K
    }[keyof T & string]
  : never

export type MessageKey = NestedKeyOf<Messages>

/**
 * useT — lightweight i18n hook.
 * Usage:
 *   const t = useT()
 *   t('brandPicker.title')  → "Оберіть заклад"
 *   t('checkout.steps.0')  → "Тип замовлення"
 */
export function useT() {
  const locale = useLocale((s) => s.locale)
  const msgs = messages[locale] || messages[DEFAULT_LOCALE]

  function t(key: string): string {
    const parts = key.split('.')
    let result: unknown = msgs
    for (const part of parts) {
      if (result == null || typeof result !== 'object') return key
      result = result[part]
    }
    return typeof result === 'string' ? result : key
  }

  return t
}

export { LOCALES, DEFAULT_LOCALE, useLocale }
export { LOCALE_LABELS } from './config'