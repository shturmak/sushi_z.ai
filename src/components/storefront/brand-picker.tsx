'use client'

import { useState, useEffect } from 'react'
import { useBrand, API } from '@/lib/store'
import { useT } from '@/i18n'
import type { BrandInfo } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, UtensilsCrossed } from 'lucide-react'

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6 space-y-4">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

export default function BrandPicker() {
  const t = useT()
  const [brands, setBrands] = useState<BrandInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setBrand = useBrand((s) => s.setBrand)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await API.brands.list()
      if (err) {
        setError(err)
      } else if (data && Array.isArray(data) && data.length > 0) {
        setBrands(data as BrandInfo[])
      } else {
        setError(t('brandPicker.noBrands'))
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleSelect(brand: BrandInfo) {
    setBrand(brand)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="mb-8 text-center">
        <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('brandPicker.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t('brandPicker.subtitle')}
        </p>
      </div>

      {loading && (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="text-center text-muted-foreground">
          <p className="text-lg">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {brands.map((brand) => (
            <Card
              key={brand.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
              onClick={() => handleSelect(brand)}
            >
              <CardContent className="p-0 overflow-hidden">
                <div
                  className="h-32 flex items-center justify-center text-5xl font-bold text-white/90 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: brand.primaryColor || '#e11d48' }}
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg leading-tight">
                    {brand.name}
                  </h3>
                  {brand.slogan && (
                    <p
                      className="text-sm font-medium"
                      style={{ color: brand.primaryColor || '#e11d48' }}
                    >
                      {brand.slogan}
                    </p>
                  )}
                  {brand.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {brand.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}