'use client'

import { useState, useEffect } from 'react'
import { useBrand, useAuth, API } from '@/lib/store'
import { useT } from '@/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  User,
  Mail,
  Phone,
  LogOut,
  Star,
  Trophy,
  Clock,
  Loader2,
  Heart,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  MessageSquareWarning,
} from 'lucide-react'
import { FeedbackDialog } from './feedback-dialog'

// ── Types ────────────────────────────────────────────────

interface LoyaltyData {
  balance: number
  lifetime: number
  tier: string
}

interface LoyaltyTransaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string | null
  createdAt: string
}

interface FavoriteItem {
  id: string
  productId: string
  product: {
    id: string
    name: string
    price: number
    weight: string | null
    imageUrl: string | null
  }
}

interface UserAddress {
  id: string
  label: string | null
  street: string
  building: string | null
  apartment: string | null
  floor: string | null
  entrance: string | null
  comment: string | null
}

// ── Component ────────────────────────────────────────────

export default function ProfileView() {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const { user, logout } = useAuth()
  const primaryColor = brand?.primaryColor || '#e11d48'

  const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    bronze: {
      label: t('profile.tiers.bronze'),
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      icon: '🥉',
    },
    silver: {
      label: t('profile.tiers.silver'),
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      icon: '🥈',
    },
    gold: {
      label: t('profile.tiers.gold'),
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      icon: '🥇',
    },
  }

  const TX_TYPE_LABELS: Record<string, string> = {
    earned: t('profile.txTypes.earned'),
    spent: t('profile.txTypes.spent'),
    adjusted: t('profile.txTypes.adjusted'),
    expired: t('profile.txTypes.expired'),
  }

  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  // Addresses
  const [addresses, setAddresses] = useState<UserAddress[]>([])
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null)
  const [addrForm, setAddrForm] = useState({ label: '', street: '', building: '', apartment: '', floor: '', entrance: '', comment: '' })

  // Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      API.loyalty.get(),
      API.loyalty.transactions(),
      API.favorites.list(),
      API.addresses.list(),
    ]).then(
      ([loyaltyRes, txRes, favRes, addrRes]) => {
        if (cancelled) return
        if (loyaltyRes.data) {
          setLoyalty(loyaltyRes.data as LoyaltyData)
        }
        if (txRes.data && Array.isArray(txRes.data)) {
          setTransactions(txRes.data as LoyaltyTransaction[])
        }
        if (favRes.data && Array.isArray(favRes.data)) {
          setFavorites(favRes.data as FavoriteItem[])
        }
        if (addrRes.data && Array.isArray(addrRes.data)) {
          setAddresses(addrRes.data as UserAddress[])
        }
        setLoading(false)
      }
    )
    return () => { cancelled = true }
  }, [])

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

  // ── Remove favorite ────────────────────────────────
  async function handleRemoveFavorite(productId: string) {
    setFavorites((prev) => prev.filter((f) => f.productId !== productId))
    await API.favorites.remove(productId)
  }

  // ── Address dialog ─────────────────────────────────
  function openAddressDialog(addr?: UserAddress) {
    if (addr) {
      setEditingAddress(addr)
      setAddrForm({
        label: addr.label || '',
        street: addr.street || '',
        building: addr.building || '',
        apartment: addr.apartment || '',
        floor: addr.floor || '',
        entrance: addr.entrance || '',
        comment: addr.comment || '',
      })
    } else {
      setEditingAddress(null)
      setAddrForm({ label: '', street: '', building: '', apartment: '', floor: '', entrance: '', comment: '' })
    }
    setAddressDialogOpen(true)
  }

  async function handleSaveAddress() {
    const payload: Record<string, string> = {}
    if (addrForm.label) payload.label = addrForm.label
    payload.street = addrForm.street
    if (addrForm.building) payload.building = addrForm.building
    if (addrForm.apartment) payload.apartment = addrForm.apartment
    if (addrForm.floor) payload.floor = addrForm.floor
    if (addrForm.entrance) payload.entrance = addrForm.entrance
    if (addrForm.comment) payload.comment = addrForm.comment

    if (editingAddress) {
      await API.addresses.update(editingAddress.id, payload)
    } else {
      await API.addresses.create(payload)
    }

    const { data } = await API.addresses.list()
    if (data && Array.isArray(data)) setAddresses(data as UserAddress[])

    setAddressDialogOpen(false)
    setEditingAddress(null)
  }

  async function handleDeleteAddress(id: string) {
    await API.addresses.delete(id)
    setAddresses((prev) => prev.filter((a) => a.id !== id))
  }

  const tierInfo = TIER_CONFIG[loyalty?.tier || 'bronze'] || TIER_CONFIG.bronze

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4 space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6 space-y-4">
            <div className="h-20 w-20 rounded-full bg-muted mx-auto" />
            <div className="h-5 w-40 rounded bg-muted mx-auto" />
            <div className="h-4 w-48 rounded bg-muted mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
      <h1 className="mb-6 text-2xl font-bold">{t('profile.title')}</h1>

      {/* User info card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
            <div
              className="flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {user?.firstName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-xl font-bold">
                {user?.firstName} {user?.lastName}
              </h2>
              {user?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center sm:justify-start">
                  <Mail className="size-3.5" />
                  {user.email}
                </div>
              )}
              {user?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center sm:justify-start">
                  <Phone className="size-3.5" />
                  {user.phone}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favorites section */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="size-4 text-red-500" />
            {t('favorites.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('favorites.empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {favorites.map((fav) => (
                <div key={fav.id} className="group relative rounded-lg border p-3">
                  <button
                    onClick={() => handleRemoveFavorite(fav.productId)}
                    className="absolute top-1.5 right-1.5 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                  >
                    <Trash2 className="size-3 text-muted-foreground" />
                  </button>
                  {fav.product.imageUrl ? (
                    <img src={fav.product.imageUrl} alt="" className="h-16 w-full object-cover rounded mb-2" />
                  ) : (
                    <div className="h-16 w-full rounded mb-2 flex items-center justify-center text-2xl" style={{ backgroundColor: primaryColor + '20' }}>
                      🍣
                    </div>
                  )}
                  <p className="text-sm font-medium line-clamp-1">{fav.product.name}</p>
                  <p className="text-sm font-bold" style={{ color: primaryColor }}>
                    {Math.round(fav.product.price)} ₴
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback / Support section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageSquareWarning className="size-4" style={{ color: primaryColor }} />
            {t('feedback.reportProblem')}
          </Button>
        </CardContent>
      </Card>

      {/* Addresses section */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" style={{ color: primaryColor }} />
              {t('addresses.title')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              onClick={() => openAddressDialog()}
            >
              <Plus className="size-3" />
              {t('addresses.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('addresses.empty')}</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MapPin className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      {addr.label && (
                        <p className="text-sm font-medium">{addr.label}</p>
                      )}
                      <p className="text-sm text-muted-foreground truncate">
                        {[addr.street, addr.building, addr.apartment].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openAddressDialog(addr)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteAddress(addr.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loyalty card */}
      {loyalty && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4" style={{ color: primaryColor }} />
              {t('profile.loyaltyTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">{t('profile.balance')}</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {Math.round(loyalty.balance)} ₴
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">{t('profile.lifetime')}</p>
                <p className="text-2xl font-bold">
                  {Math.round(loyalty.lifetime)} ₴
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('profile.yourLevel')}</span>
              <Badge className={tierInfo.color}>
                <span className="mr-1">{tierInfo.icon}</span>
                {tierInfo.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loyalty transactions */}
      {transactions.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" style={{ color: primaryColor }} />
              {t('profile.bonusHistory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="size-8 shrink-0 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor:
                            tx.type === 'earned'
                              ? primaryColor + '20'
                              : '#fca5a520',
                        }}
                      >
                        {tx.type === 'earned' ? (
                          <Star
                            className="size-4"
                            style={{ color: primaryColor }}
                          />
                        ) : (
                          <Star className="size-4 text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {TX_TYPE_LABELS[tx.type] || tx.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.description || formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p
                        className={`text-sm font-semibold ${
                          tx.type === 'earned' ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {tx.type === 'earned' ? '+' : '-'}
                        {Math.round(tx.amount)} ₴
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Logout */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="size-4" />
          {t('header.logout')}
        </Button>
      </div>

      {/* Address Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingAddress ? t('addresses.edit') : t('addresses.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('addresses.label')}</label>
              <Input
                placeholder={t('addresses.labelPlaceholder')}
                value={addrForm.label}
                onChange={(e) => setAddrForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('checkout.street')} *</label>
              <Input
                value={addrForm.street}
                onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('checkout.building')}</label>
                <Input
                  value={addrForm.building}
                  onChange={(e) => setAddrForm((f) => ({ ...f, building: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('checkout.apartment')}</label>
                <Input
                  value={addrForm.apartment}
                  onChange={(e) => setAddrForm((f) => ({ ...f, apartment: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('checkout.floor')}</label>
                <Input
                  value={addrForm.floor}
                  onChange={(e) => setAddrForm((f) => ({ ...f, floor: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('checkout.entrance')}</label>
                <Input
                  value={addrForm.entrance}
                  onChange={(e) => setAddrForm((f) => ({ ...f, entrance: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('checkout.comment')}</label>
              <Input
                value={addrForm.comment}
                onChange={(e) => setAddrForm((f) => ({ ...f, comment: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleSaveAddress}
              disabled={!addrForm.street.trim()}
              style={{ backgroundColor: primaryColor }}
              className="text-white"
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        primaryColor={primaryColor}
      />
    </div>
  )
}