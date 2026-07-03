'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth, useBrand } from '@/lib/store'
import { useT } from '@/i18n'
import LanguageSwitcher from '@/i18n/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShoppingCart,
  User,
  LogOut,
  ClipboardList,
  ChevronDown,
} from 'lucide-react'

interface StorefrontHeaderProps {
  cartCount: number
  onAuthOpen: () => void
  onNavigate: (view: 'menu' | 'orders' | 'profile') => void
}

export default function StorefrontHeader({
  cartCount,
  onAuthOpen,
  onNavigate,
}: StorefrontHeaderProps) {
  const t = useT()
  const brand = useBrand((s) => s.brand)
  const { isAuthenticated, user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const primaryColor = brand?.primaryColor || '#e11d48'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    setDropdownOpen(false)
  }

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ borderBottomColor: primaryColor + '33' }}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Brand name */}
        <button
          onClick={() => onNavigate('menu')}
          className="text-lg font-bold tracking-tight transition-colors hover:opacity-80"
          style={{ color: primaryColor }}
        >
          <span className="sm:inline hidden">{brand?.name || t('header.defaultBrand')}</span>
          <span className="sm:hidden text-xl">🍽️</span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <User className="size-4" />
                <span className="hidden sm:inline">
                  {user?.firstName || t('header.profile')}
                </span>
                <ChevronDown className="size-3.5 opacity-60" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover p-1 shadow-lg">
                  <button
                    onClick={() => {
                      onNavigate('profile')
                      setDropdownOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <User className="size-4" />
                    {t('header.profile')}
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('orders')
                      setDropdownOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <ClipboardList className="size-4" />
                    {t('header.orders')}
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive transition-colors hover:bg-accent"
                  >
                    <LogOut className="size-4" />
                    {t('header.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAuthOpen}
              className="gap-1.5"
            >
              <User className="size-4" />
              <span className="hidden sm:inline">{t('header.login')}</span>
            </Button>
          )}

          <LanguageSwitcher />

          {/* Cart button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => onNavigate('menu')}
            aria-label={t('header.cart')}
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <Badge
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center p-0 text-[10px]"
                style={{ backgroundColor: primaryColor, color: '#fff' }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}