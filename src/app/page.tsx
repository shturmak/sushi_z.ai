'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth, useBrand, API } from '@/lib/store'
import type { BrandInfo } from '@/lib/store'
import { useT } from '@/i18n'
import BrandPicker from '@/components/storefront/brand-picker'
import AuthDialog from '@/components/storefront/auth-dialog'
import StorefrontHeader from '@/components/storefront/storefront-header'
import MenuView from '@/components/storefront/menu-view'
import CheckoutView from '@/components/storefront/checkout-view'
import OrdersView from '@/components/storefront/orders-view'
import ProfileView from '@/components/storefront/profile-view'
import { UtensilsCrossed, Loader2 } from 'lucide-react'

type ViewType = 'menu' | 'checkout' | 'orders' | 'profile'

export default function StorefrontPage() {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const setBrand = useBrand((s) => s.setBrand)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const accessToken = useAuth((s) => s.accessToken)

  const [view, setView] = useState<ViewType>('menu')
  const [authOpen, setAuthOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [initializing, setInitializing] = useState(true)

  // ── Hydrate on mount ──────────────────────────────────
  useEffect(() => {
    async function init() {
      // Restore brand from localStorage
      if (typeof window !== 'undefined') {
        const savedSlug = localStorage.getItem('sc_brand')
        if (savedSlug) {
          const { data } = await API.brands.list()
          if (data && Array.isArray(data)) {
            const found = (data as BrandInfo[]).find(
              (b) => b.slug === savedSlug
            )
            if (found) {
              setBrand(found)
            }
          }
        }

        // Restore auth token
        const token = localStorage.getItem('sc_token')
        if (token && !isAuthenticated) {
          // Verify token by fetching profile
          const { data } = await API.auth.profile()
          if (data) {
            useAuth.getState().setToken(token)
            // We have a valid token, but we don't have the user object.
            // The profile endpoint returns user data directly.
            // We can construct a minimal login call.
            // Actually, let's just set the token and let the auth middleware work.
            useAuth.setState({
              user: data as any,
              accessToken: token,
              isAuthenticated: true,
            })
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('sc_token')
            localStorage.removeItem('sc_refresh')
          }
        }
      }

      setInitializing(false)
    }
    init()
    }, [])

  // ── Handlers ──────────────────────────────────────────
  const handleCartCountChange = useCallback((count: number) => {
    setCartCount(count)
  }, [])

  function handleCheckout() {
    setView('checkout')
  }

  function handleOrderCreated() {
    // Clear cart count
    setCartCount(0)
    setView('orders')
  }

  function handleNavigate(v: 'menu' | 'orders' | 'profile') {
    setView(v)
  }

  // ── Initializing screen ───────────────────────────────
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // ── No brand selected → show brand picker ─────────────
  if (!brand) {
    return <BrandPicker />
  }

  // ── Main storefront layout ────────────────────────────
  const primaryColor = brand.primaryColor || '#e11d48'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ '--brand-color': primaryColor } as React.CSSProperties}
    >
      <StorefrontHeader
        cartCount={cartCount}
        onAuthOpen={() => setAuthOpen(true)}
        onNavigate={handleNavigate}
      />

      <main className="flex-1">
        {view === 'menu' && (
          <MenuView
            onCheckout={handleCheckout}
            onCartCountChange={handleCartCountChange}
          />
        )}
        {view === 'checkout' && (
          <CheckoutView
            onOrderCreated={handleOrderCreated}
            onBack={() => setView('menu')}
          />
        )}
        {view === 'orders' && <OrdersView onNavigate={handleNavigate} />}
        {view === 'profile' && <ProfileView />}
      </main>

      {/* Auth dialog */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* Footer */}
      <footer className="mt-auto border-t py-4 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1">
          <UtensilsCrossed className="size-3" />
          <span>Powered by SushiChain</span>
        </div>
      </footer>
    </div>
  )
}