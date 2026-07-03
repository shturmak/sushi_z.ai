'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useBrand, useAuth, API } from '@/lib/store'
import { useT } from '@/i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
  MessageSquare,
  Heart,
} from 'lucide-react'
import { StarRating, StarRatingText } from '@/components/ui/star-rating'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

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
  imageUrl: string | null
  isAvailable: boolean
  optionGroups: ProductOptionGroup[]
}

interface Category {
  id: string
  name: string
  imageUrl: string | null
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

// ── Review types ───────────────────────────────────────

interface ProductReview {
  id: string
  rating: number
  comment: string | null
  isAdminReply: string | null
  createdAt: string
  user: { firstName: string; lastName: string }
}

interface ReviewDialogProps {
  productId: string
  open: boolean
  onClose: () => void
  primaryColor: string
}

const FOOD_EMOJIS = ['🍣', '🍕', '🍔', '🍱', '🍜', '🥗', '🍤', '🍣', '🥘', '🍱', '🧁', '🥤'];

function getCategoryEmoji(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes('рол') || lower.includes('roll')) return '🍣';
  if (lower.includes('сет') || lower.includes('set')) return '🍱';
  if (lower.includes('суш') || lower.includes('sushi')) return '🍣';
  if (lower.includes('піц') || lower.includes('pizza')) return '🍕';
  if (lower.includes('паст') || lower.includes('pasta')) return '🍝';
  if (lower.includes('бургер') || lower.includes('burger')) return '🍔';
  if (lower.includes('салат') || lower.includes('salad')) return '🥗';
  if (lower.includes('напо') || lower.includes('drink')) return '🥤';
  if (lower.includes('десерт') || lower.includes('dessert')) return '🧁';
  if (lower.includes('снек') || lower.includes('side')) return '🍟';
  if (lower.includes('гаряч') || lower.includes('hot') || lower.includes('рамен') || lower.includes('вук')) return '🍜';
  return FOOD_EMOJIS[Math.abs(categoryName.charCodeAt(0)) % FOOD_EMOJIS.length];
}

function ProductImage({ product, primaryColor }: { product: Product; primaryColor: string }) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-32 w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }
  return null;
}

function ProductPlaceholder({ product, primaryColor }: { product: Product; primaryColor: string }) {
  return (
    <div
      className="flex h-32 w-full items-center justify-center text-4xl"
      style={{
        backgroundColor: product.isAvailable ? primaryColor : '#a1a1aa',
      }}
    >
      <span className="drop-shadow-md">{getCategoryEmoji(product.name)}</span>
    </div>
  );
}

// ── Product Reviews Section ─────────────────────────────

function ProductReviewsSection({ productId, primaryColor }: { productId: string; primaryColor: string }) {
  const t = useT()
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    API.reviews.getByProduct(productId).then(({ data }) => {
      if (cancelled || !data) return
      const resp = data as { data: ProductReview[]; averageRating: number; totalApproved: number }
      setReviews(resp.data?.slice(0, 3) || [])
      setAvgRating(resp.averageRating || 0)
      setTotalCount(resp.totalApproved || 0)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [productId])

  if (!loaded) return null

  return (
    <>
      <Separator className="mt-2" />
      <div className="pt-2 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('reviews.title')}</span>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {avgRating.toFixed(1)} ★ ({totalCount})
              </span>
            )}
          </div>
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              <MessageSquare className="size-3" />
              {t('reviews.writeReview')}
            </Button>
          )}
        </div>

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('reviews.noReviews')}</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="text-xs space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-muted-foreground">
                    {r.user.firstName.charAt(0).toUpperCase()}
                  </span>
                  <StarRatingText rating={r.rating} className="text-xs" />
                </div>
                {r.comment && (
                  <p className="text-muted-foreground line-clamp-2">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground">{t('reviews.loginRequired')}</p>
        )}
      </div>

      {/* Review Dialog */}
      <ReviewDialog
        productId={productId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        primaryColor={primaryColor}
      />
    </>
  )
}

// ── Review Dialog ───────────────────────────────────────

function ReviewDialog({ productId, open, onClose, primaryColor }: ReviewDialogProps) {
  const t = useT()
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [orders, setOrders] = useState<Array<{ id: string; orderNumber: string; items: Array<{ productId: string }> }>>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open || !isAuthenticated) return
    // Fetch completed orders that contain this product
    API.orders.list('completed').then(({ data }) => {
      if (!data) return
      const resp = data as { orders: Array<{ id: string; orderNumber: string; items: Array<{ productId: string }> }> }
      const matching = (resp.orders || []).filter((o) =>
        o.items.some((item) => item.productId === productId)
      )
      setOrders(matching)
      if (matching.length === 1) setSelectedOrderId(matching[0].id)
    })
  }, [open, isAuthenticated, productId])

  async function handleSubmit() {
    if (!rating || !selectedOrderId) return
    setSubmitting(true)
    const { error } = await API.reviews.create(productId, {
      orderId: selectedOrderId,
      rating,
      comment: comment || undefined,
    })
    setSubmitting(false)
    if (error) return
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setRating(0)
      setComment('')
      setSelectedOrderId('')
      onClose()
    }, 2000)
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <p className="text-sm text-muted-foreground text-center py-4">{t('reviews.loginRequired')}</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('reviews.writeReview')}</DialogTitle>
        </DialogHeader>
        {success ? (
          <p className="text-sm text-center py-4 text-green-600 font-medium">{t('reviews.reviewSubmitted')}</p>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('reviews.orderRequired')}</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium mb-1.5">{t('reviews.rating')}</p>
                  <StarRating rating={rating} interactive onChange={setRating} />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1.5">{t('reviews.comment')}</p>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('reviews.commentPlaceholder')}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        )}
        {!success && orders.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!rating || submitting}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              {t('reviews.submitReview')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Menu Content (re-mounts on branch change) ────────────

function MenuContent({
  branchId,
  primaryColor,
  onAddToCart,
  favoriteProductIds,
  onToggleFavorite,
}: {
  branchId: string
  primaryColor: string
  onAddToCart: (product: Product) => void
  favoriteProductIds: Set<string>
  onToggleFavorite: (productId: string) => void
}) {
  const t = useT()
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const FAVORITES_CAT_ID = '__favorites__'

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

  // Collect all products for favorites view
  const allProducts = categories.flatMap((c) => c.products)
  const favoriteProducts = allProducts.filter((p) => favoriteProductIds.has(p.id))

  function renderProductCard(product: Product) {
    const isFav = favoriteProductIds.has(product.id)
    return (
      <Card
        key={product.id}
        className={`overflow-hidden transition-all ${
          !product.isAvailable ? 'opacity-60' : 'hover:shadow-md'
        }`}
      >
        <CardContent className="p-0">
          <div className="relative">
            <ProductImage product={product} primaryColor={primaryColor} />
            <div className={product.imageUrl ? 'hidden' : ''}>
              <ProductPlaceholder product={product} primaryColor={primaryColor} />
            </div>
            {isAuthenticated && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                className="absolute top-2 right-2 z-10 rounded-full bg-background/80 backdrop-blur p-1.5 transition-colors hover:bg-background"
              >
                <Heart
                  className={`size-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                />
              </button>
            )}
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
            <ProductReviewsSection productId={product.id} primaryColor={primaryColor} />
          </div>
        </CardContent>
      </Card>
    )
  }

  function handleCategoryClick(catId: string) {
    setActiveCategory(catId)
    if (catId === FAVORITES_CAT_ID) return
    const el = document.getElementById(`cat-${catId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Category pills */}
      <div ref={scrollRef} className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {isAuthenticated && (
          <button
            key={FAVORITES_CAT_ID}
            onClick={() => handleCategoryClick(FAVORITES_CAT_ID)}
            className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border flex items-center"
            style={
              activeCategory === FAVORITES_CAT_ID
                ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                : { borderColor: 'var(--border)', color: 'var(--foreground)' }
            }
          >
            <Heart className={`size-4 mr-1.5 shrink-0 ${activeCategory === FAVORITES_CAT_ID ? 'fill-current' : ''}`} />
            {t('favorites.title')}
          </button>
        )}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border flex items-center"
            style={
              activeCategory === cat.id
                ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                : { borderColor: 'var(--border)', color: 'var(--foreground)' }
            }
          >
            {cat.imageUrl ? (
              <img src={cat.imageUrl} alt="" className="h-5 w-5 rounded-full object-cover mr-1.5 shrink-0" />
            ) : (
              <span className="mr-0.5 shrink-0">{getCategoryEmoji(cat.name)}</span>
            )}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Favorites view */}
      {activeCategory === FAVORITES_CAT_ID && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">{t('favorites.title')}</h2>
          {favoriteProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('favorites.empty')}</p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteProducts.map((product) => renderProductCard(product))}
          </div>
        </section>
      )}

      {/* Product grid */}
      {activeCategory !== FAVORITES_CAT_ID && categories.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-20">
          <h2 className="mb-4 text-xl font-bold">{cat.name}</h2>
          {cat.products.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('menu.emptyCategory')}</p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cat.products.map((product) => renderProductCard(product))}
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

  // Favorites
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set())

  // ── Load favorites ──────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset favorites when user logs out — using functional update
      return
    }
    let cancelled = false
    API.favorites.list().then(({ data }) => {
      if (cancelled || !data) return
      const ids = new Set((data as Array<{ productId: string }>).map((f) => f.productId))
      setFavoriteProductIds(ids)
    })
    return () => { cancelled = true }
  }, [isAuthenticated])

  // ── Toggle favorite (optimistic) ───────────────────────
  async function handleToggleFavorite(productId: string) {
    const isFav = favoriteProductIds.has(productId)
    // Optimistic update
    setFavoriteProductIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(productId)
      else next.add(productId)
      return next
    })
    // API call
    const { error } = isFav
      ? await API.favorites.remove(productId)
      : await API.favorites.add(productId)
    // Revert on error
    if (error) {
      setFavoriteProductIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(productId)
        else next.delete(productId)
        return next
      })
    }
  }

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
          favoriteProductIds={favoriteProductIds}
          onToggleFavorite={handleToggleFavorite}
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