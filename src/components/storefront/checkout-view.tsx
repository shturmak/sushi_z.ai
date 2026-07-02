'use client'

import { useState, useEffect } from 'react'
import { useBrand, useAuth, API } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Truck,
  ShoppingBag,
  CreditCard,
  Banknote,
  Gift,
  Percent,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────

interface CartItem {
  id: string
  productId: string
  quantity: number
  totalPrice: number
  product: { name: string; price: number }
}

interface Branch {
  id: string
  name: string
  address: string
}

interface CheckoutViewProps {
  onOrderCreated: () => void
  onBack: () => void
}

// ── Steps ────────────────────────────────────────────────

const STEPS = [
  'Тип замовлення',
  'Адреса',
  'Промокод',
  'Оплата',
  'Бонуси',
  'Підтвердження',
] as const

const TOTAL_STEPS = STEPS.length

// ── Component ────────────────────────────────────────────

export default function CheckoutView({ onOrderCreated, onBack }: CheckoutViewProps) {
  const brand = useBrand((s) => s.brand)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const primaryColor = brand?.primaryColor || '#e11d48'

  const [step, setStep] = useState(0)

  // Step 1: order type
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')

  // Step 2: address
  const [street, setStreet] = useState('')
  const [building, setBuilding] = useState('')
  const [apartment, setApartment] = useState('')
  const [floor, setFloor] = useState('')
  const [entrance, setEntrance] = useState('')
  const [comment, setComment] = useState('')

  // Step 3: promo
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoData, setPromoData] = useState<any>(null)

  // Step 4: payment
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'bonus'>('card')

  // Step 5: bonus
  const [bonusBalance, setBonusBalance] = useState(0)
  const [bonusToUse, setBonusToUse] = useState(0)

  // Data
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Load data on mount ─────────────────────────────────
  useEffect(() => {
    async function load() {
      const [branchesRes, cartRes, loyaltyRes] = await Promise.all([
        API.branches.list(),
        API.cart.get(),
        API.loyalty.get(),
      ])

      if (branchesRes.data && Array.isArray(branchesRes.data)) {
        const bList = branchesRes.data as Branch[]
        setBranches(bList)
        if (bList.length > 0) {
          setSelectedBranchId(bList[0].id)
        }
      }

      if (cartRes.data) {
        const c = cartRes.data as any
        setCartItems(c.items || [])
        setSubtotal(c.subtotal || 0)
      }

      if (loyaltyRes.data) {
        setBonusBalance(loyaltyRes.data.balance || 0)
      }
    }
    if (isAuthenticated) load()
  }, [isAuthenticated])

  // ── Derived values ─────────────────────────────────────
  const discount = promoDiscount
  const total = Math.max(0, subtotal + deliveryFee - discount - bonusToUse)

  // ── Promo apply ────────────────────────────────────────
  async function handleApplyPromo() {
    if (!promoCode.trim()) return
    setPromoError('')
    const { data, error } = await API.promotions.validate(promoCode, subtotal)
    if (error) {
      setPromoError(error)
      setPromoDiscount(0)
      setPromoData(null)
    } else if (data) {
      setPromoData(data)
      let disc = 0
      if (data.type === 'percentage') {
        disc = (subtotal * data.value) / 100
      } else if (data.type === 'fixed') {
        disc = data.value
      } else if (data.type === 'free_delivery') {
        setDeliveryFee(0)
      }
      setPromoDiscount(disc)
    }
  }

  // ── Step validation ────────────────────────────────────
  function canProceed(): boolean {
    switch (step) {
      case 1:
        if (orderType === 'delivery') return street.trim().length > 0
        return true
      case 2:
        return true
      case 3:
        return true
      case 4:
        return true
      case 5:
        return true
      default:
        return true
    }
  }

  // ── Submit order ───────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')

    const orderPayload: Record<string, any> = {
      branchId: selectedBranchId,
      type: orderType,
      paymentMethod,
      promotionCode: promoData?.code || null,
      useBonus: bonusToUse > 0 ? bonusToUse : 0,
      note: comment || null,
    }

    if (orderType === 'delivery') {
      orderPayload.address = { street, building, apartment, floor, entrance }
    }

    const { data, error } = await API.orders.create(orderPayload)

    setSubmitting(false)

    if (error) {
      setSubmitError(error)
      return
    }
    if (data) {
      onOrderCreated()
    }
  }

  // ── Selected branch info ───────────────────────────────
  const selectedBranch = branches.find((b) => b.id === selectedBranchId)

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold">Оформлення замовлення</h1>
          <div className="w-9" />
        </div>
        <div className="flex gap-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                backgroundColor: i <= step ? primaryColor : 'var(--muted)',
              }}
              title={label}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{STEPS[step]}</p>
      </div>

      {/* ── Step 0: Order type ──────────────────────────── */}
      {step === 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setOrderType('delivery')}
            className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all ${
              orderType === 'delivery' ? 'border-current' : 'border-transparent bg-muted/50'
            }`}
            style={orderType === 'delivery' ? { color: primaryColor, borderColor: primaryColor } : {}}
          >
            <Truck className="size-8 shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Доставка</p>
              <p className="text-sm text-muted-foreground">
                Доставимо до вашої адреси
              </p>
            </div>
          </button>

          <button
            onClick={() => setOrderType('pickup')}
            className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all ${
              orderType === 'pickup' ? 'border-current' : 'border-transparent bg-muted/50'
            }`}
            style={orderType === 'pickup' ? { color: primaryColor, borderColor: primaryColor } : {}}
          >
            <ShoppingBag className="size-8 shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Самовивіз</p>
              <p className="text-sm text-muted-foreground">
                Заберете самостійно з філії
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ── Step 1: Address ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {orderType === 'delivery' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Вулиця *</label>
                <Input
                  placeholder="вул. Шевченка"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Будинок</label>
                  <Input
                    placeholder="12"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Квартира</label>
                  <Input
                    placeholder="45"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Поверх</label>
                  <Input
                    placeholder="3"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Під&apos;їзд</label>
                  <Input
                    placeholder="2"
                    value={entrance}
                    onChange={(e) => setEntrance(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Коментар</label>
                <Input
                  placeholder="Код домофону, інструкція..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="size-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{selectedBranch?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBranch?.address}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Step 2: Promo code ─────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Промокод</label>
            <div className="flex gap-2">
              <Input
                placeholder="Введіть промокод"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <Button variant="outline" onClick={handleApplyPromo}>
                Застосувати
              </Button>
            </div>
            {promoError && (
              <p className="text-sm text-destructive">{promoError}</p>
            )}
            {promoDiscount > 0 && (
              <p className="text-sm font-medium" style={{ color: primaryColor }}>
                Знижка: {Math.round(promoDiscount)} ₴
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Payment ─────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-3">
          {[
            { value: 'card' as const, label: 'Картка', icon: CreditCard },
            { value: 'cash' as const, label: 'Готівка', icon: Banknote },
            { value: 'bonus' as const, label: 'Бонуси', icon: Gift },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setPaymentMethod(value)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                paymentMethod === value
                  ? 'border-current'
                  : 'border-transparent bg-muted/50'
              }`}
              style={
                paymentMethod === value
                  ? { color: primaryColor, borderColor: primaryColor }
                  : {}
              }
            >
              <Icon className="size-6 shrink-0" />
              <span className="font-semibold">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 4: Bonus usage ─────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Доступні бонуси:
                </span>
                <span className="font-bold" style={{ color: primaryColor }}>
                  {Math.round(bonusBalance)} ₴
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Використати бонуси
                </label>
                <Input
                  type="number"
                  min={0}
                  max={Math.min(bonusBalance, subtotal)}
                  placeholder="0"
                  value={bonusToUse || ''}
                  onChange={(e) => {
                    const v = Math.min(
                      Number(e.target.value) || 0,
                      bonusBalance,
                      subtotal
                    )
                    setBonusToUse(v)
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Максимум: {Math.round(Math.min(bonusBalance, subtotal))} ₴
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 5: Summary ─────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Деталі замовлення</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Type */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Тип:</span>
                <span className="font-medium">
                  {orderType === 'delivery' ? 'Доставка' : 'Самовивіз'}
                </span>
              </div>

              {/* Address */}
              {orderType === 'delivery' ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Адреса:</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {[street, building, apartment].filter(Boolean).join(', ')}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Філія:</span>
                  <span className="font-medium">{selectedBranch?.name}</span>
                </div>
              )}

              <Separator />

              {/* Items */}
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {Math.round(item.totalPrice)} ₴
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Підсумок:</span>
                <span>{Math.round(subtotal)} ₴</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Доставка:</span>
                  <span>{Math.round(deliveryFee)} ₴</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Знижка:</span>
                  <span>-{Math.round(discount)} ₴</span>
                </div>
              )}
              {bonusToUse > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Бонуси:</span>
                  <span>-{Math.round(bonusToUse)} ₴</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Разом:</span>
                <span>{Math.round(total)} ₴</span>
              </div>

              {/* Payment method */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Оплата:</span>
                <span className="font-medium">
                  {paymentMethod === 'card'
                    ? 'Картка'
                    : paymentMethod === 'cash'
                      ? 'Готівка'
                      : 'Бонуси'}
                </span>
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────── */}
      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft className="size-4" />
            Назад
          </Button>
        )}
        {step < TOTAL_STEPS - 1 && (
          <Button
            className="flex-1 text-white"
            style={{ backgroundColor: primaryColor }}
            disabled={!canProceed()}
            onClick={() => setStep(step + 1)}
          >
            Далі
            <ChevronRight className="size-4" />
          </Button>
        )}
        {step === TOTAL_STEPS - 1 && (
          <Button
            className="flex-1 text-white"
            style={{ backgroundColor: primaryColor }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Підтвердити замовлення
          </Button>
        )}
      </div>
    </div>
  )
}