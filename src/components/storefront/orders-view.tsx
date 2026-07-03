'use client'

import { useState, useEffect } from 'react'
import { useBrand, API } from '@/lib/store'
import { useT } from '@/i18n'
import { useOrderWebSocket, type OrderWSPayload } from '@/hooks/use-order-ws'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  XCircle,
  Clock,
  CheckCircle2,
  Flame,
  Truck,
  Package,
  ClipboardList,
  Star,
} from 'lucide-react'
import { StarRating } from '@/components/ui/star-rating'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// ── Types ────────────────────────────────────────────────

interface OrderItem {
  id: string
  productName: string
  productPrice: number
  quantity: number
  totalPrice: number
  productId?: string
}

interface Order {
  id: string
  orderNumber: string
  type: 'delivery' | 'pickup'
  status: string
  addressSnapshot: string | null
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  note: string | null
  bonusUsed: number
  estimatedMinutes: number | null
  createdAt: string
  branch: { name: string; address: string }
  items: OrderItem[]
  payments: { method: string; status: string }[]
  // Timeline fields
  confirmedAt: string | null
  cookingAt: string | null
  readyAt: string | null
  deliveringAt: string | null
  completedAt: string | null
  cancelledAt: string | null
}

interface OrdersResponse {
  orders: Order[]
  total: number
  pages: number
}

interface OrdersViewProps {
  onNavigate?: (view: 'menu' | 'orders' | 'profile') => void
}

// ── Component ────────────────────────────────────────────

export default function OrdersView({ onNavigate }: OrdersViewProps) {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const primaryColor = brand?.primaryColor || '#e11d48'

  // ── Status config (inside component for t() access) ───
  const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    new: { label: t('orders.statuses.new'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: ClipboardList },
    confirmed: { label: t('orders.statuses.confirmed'), color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300', icon: Clock },
    cooking: { label: t('orders.statuses.cooking'), color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: Flame },
    ready: { label: t('orders.statuses.ready'), color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300', icon: CheckCircle2 },
    delivering: { label: t('orders.statuses.delivering'), color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', icon: Truck },
    completed: { label: t('orders.statuses.completed'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle2 },
    cancelled: { label: t('orders.statuses.cancelled'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle },
  }

  const PAYMENT_LABELS: Record<string, string> = {
    card: t('orders.payments.card'),
    cash: t('orders.payments.cash'),
    bonus: t('orders.payments.bonus'),
  }

  // ── Timeline entries ──────────────────────────────────
  function getTimeline(order: Order): { label: string; time: string | null }[] {
    const items = [
      { label: t('orders.timelineLabels.created'), time: order.createdAt },
      { label: t('orders.timelineLabels.confirmed'), time: order.confirmedAt },
      { label: t('orders.timelineLabels.cooking'), time: order.cookingAt },
      { label: t('orders.timelineLabels.ready'), time: order.readyAt },
      { label: t('orders.timelineLabels.delivering'), time: order.deliveringAt },
      { label: t('orders.timelineLabels.completed'), time: order.completedAt },
    ]
    if (order.cancelledAt) {
      items.push({ label: t('orders.timelineLabels.cancelled'), time: order.cancelledAt })
    }
    return items.filter((i) => i.time !== null)
  }

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [flashOrderId, setFlashOrderId] = useState<string | null>(null)

  // Track which order IDs to subscribe to via WebSocket
  const orderIds = orders.map((o) => o.id)
  const { onStatusChanged } = useOrderWebSocket(brand?.id ?? null, { orderIds })

  useEffect(() => {
    let cancelled = false
    API.orders.list().then(({ data }) => {
      if (cancelled) return
      if (data) {
        const resp = data as OrdersResponse
        setOrders(resp.orders || [])
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Real-time status updates via WebSocket
  useEffect(() => {
    const unsub = onStatusChanged((payload: OrderWSPayload) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === payload.orderId
            ? { ...o, status: payload.status || o.status }
            : o,
        ),
      )
      // Flash animation for the updated order
      setFlashOrderId(payload.orderId)
      setTimeout(() => setFlashOrderId(null), 2000)
    })
    return unsub
  }, [onStatusChanged])

  async function handleRepeat(id: string) {
    const { data, error } = await API.orders.repeat(id)
    if (error) return
    if (data) {
      // Update cart count from the returned cart
      const cart = data as any
      const totalItems = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
      // Navigate to menu view where cart is visible
      onNavigate?.('menu')
    }
  }

  async function handleCancel(id: string) {
    const { error } = await API.orders.cancel(id)
    if (error) return
    const { data: freshData } = await API.orders.list()
    if (freshData) {
      const resp = freshData as OrdersResponse
      setOrders(resp.orders || [])
    }
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // ── Skeleton ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 space-y-4">
        <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div className="h-5 w-24 rounded bg-muted" />
                <div className="h-5 w-16 rounded bg-muted" />
              </div>
              <div className="mt-3 h-4 w-32 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <h1 className="mb-6 text-2xl font-bold">{t('orders.title')}</h1>

      {orders.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          <Package className="mx-auto mb-4 size-12 opacity-40" />
          <p className="text-lg">{t('orders.empty')}</p>
          <p className="text-sm mt-1">{t('orders.emptyHint')}</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.new
          const StatusIcon = statusInfo.icon
          const isExpanded = expandedId === order.id

          return (
            <Card key={order.id} className={cn(
              'overflow-hidden transition-all duration-500',
              flashOrderId === order.id && 'ring-2 ring-primary shadow-lg shadow-primary/20',
            )}>
              <CardContent className="p-0">
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        #{order.orderNumber}
                      </span>
                      <Badge variant="secondary" className={statusInfo.color}>
                        <StatusIcon className="size-3" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">
                      {Math.round(order.total)} ₴
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    {/* Branch & type */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('checkout.branch')}</span>
                      <span className="font-medium">{order.branch.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('checkout.type')}</span>
                      <span className="font-medium">
                        {order.type === 'delivery' ? t('checkout.delivery') : t('checkout.pickup')}
                      </span>
                    </div>

                    {/* Address */}
                    {order.type === 'delivery' && order.addressSnapshot && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('checkout.address')}</span>
                        <span className="font-medium text-right max-w-[60%]">
                          {(() => {
                            try {
                              const addr = JSON.parse(order.addressSnapshot)
                              return [addr.street, addr.building, addr.apartment]
                                .filter(Boolean)
                                .join(', ')
                            } catch {
                              return order.addressSnapshot
                            }
                          })()}
                        </span>
                      </div>
                    )}

                    {/* Payment */}
                    {order.payments.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('checkout.payment')}</span>
                        <span className="font-medium">
                          {PAYMENT_LABELS[order.payments[0].method] ||
                            order.payments[0].method}
                        </span>
                      </div>
                    )}

                    <Separator />

                    {/* Items */}
                    <div className="space-y-1.5">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {item.productName} × {item.quantity}
                          </span>
                          <div className="flex items-center gap-2">
                            {order.status === 'completed' && item.productId && (
                              <OrderItemReviewButton
                                orderId={order.id}
                                productId={item.productId}
                                productName={item.productName}
                                primaryColor={primaryColor}
                              />
                            )}
                            <span className="font-medium">
                              {Math.round(item.totalPrice)} ₴
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('common.subtotal')}</span>
                        <span>{Math.round(order.subtotal)} ₴</span>
                      </div>
                      {order.deliveryFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Доставка:
                          </span>
                          <span>{Math.round(order.deliveryFee)} ₴</span>
                        </div>
                      )}
                      {order.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>{t('common.discount')}:</span>
                          <span>-{Math.round(order.discount)} ₴</span>
                        </div>
                      )}
                      {order.bonusUsed > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>{t('common.bonuses')}:</span>
                          <span>-{Math.round(order.bonusUsed)} ₴</span>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    {getTimeline(order).length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{t('orders.timeline')}</p>
                          {getTimeline(order).map((entry, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: primaryColor }}
                              />
                              <span className="text-muted-foreground">
                                {entry.label}:
                              </span>
                              <span className="text-xs">
                                {entry.time ? formatDate(entry.time) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    {(order.status === 'completed' ||
                      order.status === 'cancelled' ||
                      order.status === 'new' ||
                      order.status === 'confirmed') && (
                      <div className="flex gap-2 pt-1">
                        {(order.status === 'completed' || order.status === 'cancelled') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleRepeat(order.id)}
                          >
                            <RotateCcw className="size-3.5" />
                            {t('orders.repeat')}
                          </Button>
                        )}
                        {(order.status === 'new' ||
                          order.status === 'confirmed') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleCancel(order.id)}
                          >
                            <XCircle className="size-3.5" />
                            {t('orders.cancelOrder')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Order Item Review Button ──────────────────────────

function OrderItemReviewButton({
  orderId,
  productId,
  productName,
  primaryColor,
}: {
  orderId: string
  productId: string
  productName: string
  primaryColor: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-amber-500"
        onClick={() => {
          setDialogKey((k) => k + 1)
          setOpen(true)
        }}
      >
        <Star className="size-3" />
      </Button>
      <OrderItemReviewDialog
        key={dialogKey}
        orderId={orderId}
        productId={productId}
        productName={productName}
        open={open}
        onClose={() => setOpen(false)}
        primaryColor={primaryColor}
      />
    </>
  )
}

function OrderItemReviewDialog({
  orderId,
  productId,
  productName,
  open,
  onClose,
  primaryColor,
}: {
  orderId: string
  productId: string
  productName: string
  open: boolean
  onClose: () => void
  primaryColor: string
}) {
  const t = useT()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)
    const { error } = await API.reviews.create(productId, {
      orderId,
      rating,
      comment: comment || undefined,
    })
    setSubmitting(false)
    if (error) {
      if (error.includes('already') || error.includes('409')) {
        setAlreadyReviewed(true)
      }
      return
    }
    setSuccess(true)
    setTimeout(() => {
      onClose()
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('reviews.writeReview')}</DialogTitle>
        </DialogHeader>
        {success ? (
          <p className="text-sm text-center py-4 text-green-600 font-medium">{t('reviews.reviewSubmitted')}</p>
        ) : alreadyReviewed ? (
          <p className="text-sm text-center py-4 text-muted-foreground">{t('reviews.reviewSubmitted')}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{productName}</p>
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
          </div>
        )}
        {!success && !alreadyReviewed && (
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