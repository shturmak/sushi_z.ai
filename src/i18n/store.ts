import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_LOCALE, type Locale } from './config'

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLocale = create<I18nState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'sushichain-locale' },
  ),
)