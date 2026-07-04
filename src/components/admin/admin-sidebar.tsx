'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Building2, Store, MapPin, UtensilsCrossed, ShoppingCart,
  Tag, Star, MessageCircleWarning, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useT } from '@/i18n';
import { useNewOrderCount } from '@/components/admin/order-notifications';
import { usePendingReviewCount } from '@/app/admin/reviews/page';

function OrdersBadge() {
  const { count } = useNewOrderCount()
  if (count === 0) return null
  return (
    <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-red-500 text-[11px] font-bold text-white leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ReviewsBadge() {
  const count = usePendingReviewCount()
  if (count === 0) return null
  return (
    <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-amber-500 text-[11px] font-bold text-white leading-none">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function AdminSidebar() {
  const t = useT();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(pathname.startsWith('/admin/menu'));

  const navItems = [
    { href: '/admin', label: t('admin.sidebar.analytics'), icon: BarChart3 },
    { href: '/admin/brands', label: t('admin.sidebar.brands'), icon: Building2 },
    { href: '/admin/branches', label: t('admin.sidebar.branches'), icon: Store },
    { href: '/admin/delivery-zones', label: t('admin.sidebar.deliveryZones'), icon: MapPin },
    {
      label: t('admin.sidebar.menu'), icon: UtensilsCrossed,
      children: [
        { href: '/admin/menu/categories', label: t('admin.sidebar.categories') },
        { href: '/admin/menu/products', label: t('admin.sidebar.products') },
      ],
    },
    { href: '/admin/orders', label: t('admin.sidebar.orders'), icon: ShoppingCart },
    { href: '/admin/promotions', label: t('admin.sidebar.promotions'), icon: Tag },
    { href: '/admin/reviews', label: t('admin.sidebar.reviews'), icon: Star },
    { href: '/admin/feedback', label: t('admin.sidebar.feedback'), icon: MessageCircleWarning },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          S
        </div>
        <div>
          <h1 className="font-semibold text-sm leading-tight">Суші Мастер</h1>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if ('children' in item && item.children) {
            const isActive = pathname.startsWith('/admin/menu');
            return (
              <div key={item.label}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={cn(
                    'flex items-center w-full gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {menuOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
                {menuOpen && (
                  <div className="ml-7 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'block px-3 py-1.5 rounded-md text-sm transition-colors',
                          pathname === child.href
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href!);
          const showBadge = item.href === '/admin/orders'
          const showReviewsBadge = item.href === '/admin/reviews'
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => {
                if (showBadge) window.dispatchEvent(new Event('admin-orders-viewed'))
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {showBadge && <OrdersBadge />}
              {showReviewsBadge && <ReviewsBadge />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        v1.0.0 · SushiChain Admin
      </div>
    </aside>
  );
}