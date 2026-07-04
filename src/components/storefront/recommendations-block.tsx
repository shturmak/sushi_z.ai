'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/i18n'
import { API } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles } from 'lucide-react'

interface RecommendedProduct {
  id: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
}

interface RecommendationsBlockProps {
  branchId: string
  onAddToCart: (product: any) => void
  primaryColor: string
}

const FOOD_EMOJIS = ['🍣', '🍕', '🍔', '🍱', '🍜', '🥗', '🍤', '🥘', '🧁', '🥤']

function getEmoji(name: string): string {
  return FOOD_EMOJIS[Math.abs(name.charCodeAt(0)) % FOOD_EMOJIS.length]
}

function ProductCard({
  product,
  primaryColor,
  onAdd,
}: {
  product: RecommendedProduct
  primaryColor: string
  onAdd: () => void
}) {
  return (
    <Card className="shrink-0 w-40 sm:w-48 overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="relative h-28">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-28 w-full object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                el.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <div
            className={`${product.imageUrl ? 'hidden' : ''} flex h-28 w-full items-center justify-center text-3xl`}
            style={{ backgroundColor: primaryColor }}
          >
            <span className="drop-shadow-md">{getEmoji(product.name)}</span>
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <h4 className="font-medium text-sm leading-tight line-clamp-2">{product.name}</h4>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">{Math.round(product.price)} ₴</span>
            <Button
              size="sm"
              className="h-7 w-7 p-0 text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={onAdd}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RecommendationsBlock({
  branchId,
  onAddToCart,
  primaryColor,
}: RecommendationsBlockProps) {
  const t = useT()
  const [orderedBefore, setOrderedBefore] = useState<RecommendedProduct[]>([])
  const [popular, setPopular] = useState<RecommendedProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    API.recommendations.list(branchId).then(({ data }) => {
      if (cancelled) return
      if (!data) {
        setLoading(false)
        return
      }
      const resp = data as { orderedBefore: RecommendedProduct[]; popular: RecommendedProduct[] }
      setOrderedBefore(resp.orderedBefore || [])
      setPopular(resp.popular || [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [branchId])

  // Don't render if loading or no data
  if (loading) return null
  if (orderedBefore.length === 0 && popular.length === 0) return null

  return (
    <div className="space-y-4 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="size-4" style={{ color: primaryColor }} />
        <h2 className="text-lg font-bold">{t('recommendations.title')}</h2>
      </div>

      {/* Ordered Before section */}
      {orderedBefore.length > 0 && (
        <section>
          <p className="text-sm text-muted-foreground mb-2">
            {t('recommendations.orderedBefore')}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {orderedBefore.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                primaryColor={primaryColor}
                onAdd={() => onAddToCart(product)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Popular section */}
      {popular.length > 0 && (
        <section>
          <p className="text-sm text-muted-foreground mb-2">
            {t('recommendations.popular')}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {popular.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                primaryColor={primaryColor}
                onAdd={() => onAddToCart(product)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}