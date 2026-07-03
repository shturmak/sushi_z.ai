'use client'

import Link from 'next/link'
import { useT } from '@/i18n'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const t = useT()

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-8xl font-bold tracking-tighter text-muted-foreground/40">
        404
      </span>
      <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
      <p className="max-w-md text-muted-foreground">{t('notFound.description')}</p>
      <Button asChild size="lg">
        <Link href="/">{t('notFound.goHome')}</Link>
      </Button>
    </div>
  )
}