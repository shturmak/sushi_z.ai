'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useBrand, useAuth, API } from '@/lib/store'
import { useT } from '@/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  Store,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────

interface Branch {
  id: string
  name: string
  slug: string
  address: string
  isOpen: boolean
}

interface ProductOption {
  id: string
  groupId: string
  name: string
  priceDelta: number
}

interface ProductOptionGroup {
  id: string
  name: string
  isRequired: boolean
  maxChoices: number
  options: ProductOption[]
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  weight: string | null
  isAvailable: boolean
  optionGroups: ProductOptionGroup[]
}

interface Category {
  id: string
  name: string
  products: Product[]
}

interface CartItem {
  id: string
  productId: string
  quantity: number
  totalPrice: number
  product: {
    name: string
    price: number
  }
}

interface Cart {
  id: string
  totalItems: number
  subtotal: number
  items: CartItem[]
}

interface MenuViewProps {
  onCheckout: () => void
  onCartCountChange: (count: number) => void
}

// ── Menu Content (re-mounts on branch change) ────────────

function MenuContent({
  branchId,
  primaryColor,
  onAddToCart,
}: {
  branchId: string
  primaryColor: string
  onAddToCart: (product: Product) => void
}) {
  const t = useT()
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    API.menu.byBranch(branchId).then(({ data }) => {
      if (cancelled) return
      if (data && Array.isArray(data)) {
        const cats = data as Category[]
        setCategories(cats)
        if (cats.length > 0) setActiveCategory(cats[0].id)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [branchId])

  function handleCategoryClick(catId: string) {
    setActiveCategory(catId)
    const el = document.getElementById(`cat-${catId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="mb-3 h-28 rounded-lg bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-full rounded bg-muted" />
              <div className="mt-2 h-8 w-24 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p className="text-lg">{t('menu.emptyMenu')}</p>
        <p className="text-sm mt-1">{t('menu.emptyMenuHint')}</p>
      </div>
    )
  }

  return (
    <>
      {/* Category pills */}
      <div ref={scrollRef} className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border"
            style={
              activeCategory === cat.id
                ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                : { borderColor: 'var(--border)', color: 'var(--foreground)' }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {categories.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-20">
          <h2 className="mb-4 text-xl font-bold">{cat.name}</h2>
          {cat.products.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('menu.emptyCategory')}</p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.products.map((product) => (
              <Card
                key={product.id}
                className={`overflow-hidden transition-all ${
                  !product.isAvailable ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-0">
                  <div
                    className="flex h-32 items-center justify-center text-4xl font-bold text-white/80"
                    style={{
                      backgroundColor: product.isAvailable ? primaryColor : '#a1a1aa',
                    }}
                  >
                    {product.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight line-clamp-2">
                        {product.name}
                      </h3>
                      {product.weight && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {product.weight}
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-lg font-bold">
                        {Math.round(product.price)} ₴
                      </span>
                      {product.isAvailable ? (
                        <Button
                          size="sm"
                          onClick={() => onAddToCart(product)}
                          style={
                            { '--primary': primaryColor } as React.CSSProperties
                          }
                          className="text-white"
                        >
                          <Plus className="size-4" />
                          {t('menu.add')}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t('menu.notAvailable')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

// ── Main Component ───────────────────────────────────────

export default function MenuView({ onCheckout, onCartCountChange }: MenuViewProps) {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const primaryColor = brand?.primaryColor || '#e11d48'

  // Data
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  // Cart
  const [cart, setCart] = useState<Cart | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartSubtotal, setCartSubtotal] = useState(0)

  // Loading
  const [addingItemId, setAddingItemId] = useState<string | null>(null)

  // ── Load branches ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await API.branches.list()
      if (data && Array.isArray(data)) {
        const list = data as Branch[]
        setBranches(list)
        if (list.length > 0 && !selectedBranchId) {
          setSelectedBranchId(list[0].id)
        }
      }
    }
    load()
  }, [])

  // ── Ensure cart exists ─────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !selectedBranchId) return
    let cancelled = false
    API.cart.getOrCreate().then(({ data }) => {
      if (cancelled) return
      if (data) {
        setCart(data as Cart)
        setCartSubtotal(data.subtotal || 0)
        onCartCountChange(data.totalItems || 0)
        return
      }
      API.cart.create(selectedBranchId).then(({ data: newCart }) => {
        if (cancelled || !newCart) return
        const c = { ...newCart, totalItems: 0, subtotal: 0, items: [] }
        setCart(c)
        setCartSubtotal(0)
        onCartCountChange(0)
      })
    })
    return () => { cancelled = true }
  }, [isAuthenticated, selectedBranchId, onCartCountChange])

  // ── Poll cart every 3s ─────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(async () => {
      const { data } = await API.cart.get()
      if (data) {
        setCart(data as Cart)
        setCartSubtotal(data.subtotal || 0)
        onCartCountChange(data.totalItems || 0)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isAuthenticated, onCartCountChange])

  // ── Add to cart ────────────────────────────────────────
  async function handleAddToCart(product: Product) {
    if (!isAuthenticated || addingItemId) return
    setAddingItemId(product.id)
    const { data } = await API.cart.addItem({
      productId: product.id,
      quantity: 1,
    })
    if (data) {
      const { data: fresh } = await API.cart.get()
      if (fresh) {
        setCart(fresh as Cart)
        setCartSubtotal(fresh.subtotal || 0)
        onCartCountChange(fresh.totalItems || 0)
      }
    }
    setAddingItemId(null)
  }

  // ── Update item quantity ───────────────────────────────
  async function handleUpdateQuantity(itemId: string, newQty: number) {
    if (newQty <= 0) {
      await API.cart.removeItem(itemId)
    } else {
      await API.cart.updateItem(itemId, newQty)
    }
    const { data } = await API.cart.get()
    if (data) {
      setCart(data as Cart)
      setCartSubtotal(data.subtotal || 0)
      onCartCountChange(data.totalItems || 0)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4">
      {/* Branch selector */}
      <div className="mb-4 flex items-center gap-3">
        <Store className="size-4 text-muted-foreground shrink-0" />
        <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('menu.selectBranch')} />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} — {b.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Menu content — key resets component on branch change */}
      {selectedBranchId && (
        <MenuContent
          key={selectedBranchId}
          branchId={selectedBranchId}
          primaryColor={primaryColor}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── Cart Sheet ──────────────────────────────────── */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('cart.title')}</SheetTitle>
            <SheetDescription>
              {cart?.totalItems
                ? `${cart.totalItems} ${pluralizeItems(t, cart.totalItems)}`
                : t('cart.empty')}
            </SheetDescription>
          </SheetHeader>

          {cart && cart.items.length > 0 ? (
            <>
              <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-4 py-2">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(item.totalPrice)} ₴
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => handleUpdateQuantity(item.id, 0)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              <SheetFooter className="flex-col gap-3 pt-2">
                <div className="flex w-full items-center justify-between text-lg font-bold">
                  <span>{t('common.total')}</span>
                  <span>{Math.round(cartSubtotal)} ₴</span>
                </div>
                <Button
                  className="w-full text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => {
                    setCartOpen(false)
                    onCheckout()
                  }}
                >
                  {t('cart.checkout')}
                </Button>
              </SheetFooter>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="mx-auto mb-3 size-10 opacity-40" />
                <p>{t('cart.empty')}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Bottom Cart Bar ─────────────────────────────── */}
      {isAuthenticated && cart && cart.totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur p-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              <span className="text-sm font-medium">
                {cart.totalItems} {pluralizeItems(t, cart.totalItems)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold">{Math.round(cartSubtotal)} ₴</span>
              <Button
                className="text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={() => setCartOpen(true)}
              >
                {t('cart.title')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────

function pluralizeItems(t: (key: string) => string, n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return t('cart.items_one')
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return t('cart.items_few')
  return t('cart.items_many')
}