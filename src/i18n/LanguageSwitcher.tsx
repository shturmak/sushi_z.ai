'use client'

import { useLocale } from '@/i18n/store'
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <SelectTrigger className="w-auto gap-1 border-0 bg-transparent px-2 h-8 text-xs">
        <span className="truncate">{LOCALE_LABELS[locale].split(' ')[0]}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALES.map((l) => (
          <SelectItem key={l} value={l} className="text-sm">
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}