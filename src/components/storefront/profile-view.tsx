'use client'

import { useState, useEffect } from 'react'
import { useBrand, useAuth, API } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  User,
  Mail,
  Phone,
  LogOut,
  Star,
  Trophy,
  Clock,
  Loader2,
} from 'lucide-react'

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

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bronze: {
    label: 'Бронза',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: '🥉',
  },
  silver: {
    label: 'Срібло',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: '🥈',
  },
  gold: {
    label: 'Золото',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: '🥇',
  },
}

const TX_TYPE_LABELS: Record<string, string> = {
  earned: 'Нараховано',
  spent: 'Витрачено',
  adjusted: 'Коригування',
  expired: 'Сплачено',
}

// ── Component ────────────────────────────────────────────

export default function ProfileView() {
  const brand = useBrand((s) => s.brand)
  const { user, logout } = useAuth()
  const primaryColor = brand?.primaryColor || '#e11d48'

  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([API.loyalty.get(), API.loyalty.transactions()]).then(
      ([loyaltyRes, txRes]) => {
        if (cancelled) return
        if (loyaltyRes.data) {
          setLoyalty(loyaltyRes.data as LoyaltyData)
        }
        if (txRes.data && Array.isArray(txRes.data)) {
          setTransactions(txRes.data as LoyaltyTransaction[])
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
      <h1 className="mb-6 text-2xl font-bold">Профіль</h1>

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

      {/* Loyalty card */}
      {loyalty && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4" style={{ color: primaryColor }} />
              Програма лояльності
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">Баланс</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {Math.round(loyalty.balance)} ₴
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-sm text-muted-foreground">Всього зароблено</p>
                <p className="text-2xl font-bold">
                  {Math.round(loyalty.lifetime)} ₴
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ваш рівень:</span>
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
              Історія бонусів
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
          Вийти
        </Button>
      </div>
    </div>
  )
}