'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Building2, Store, UtensilsCrossed, ShoppingCart,
  Tag, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/admin', label: 'Аналітика', icon: BarChart3 },
  { href: '/admin/brands', label: 'Бренди', icon: Building2 },
  { href: '/admin/branches', label: 'Філіали', icon: Store },
  {
    label: 'Меню', icon: UtensilsCrossed,
    children: [
      { href: '/admin/menu/categories', label: 'Категорії' },
      { href: '/admin/menu/products', label: 'Блюда' },
    ],
  },
  { href: '/admin/orders', label: 'Закази', icon: ShoppingCart },
  { href: '/admin/promotions', label: 'Акції / Промокоди', icon: Tag },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(pathname.startsWith('/admin/menu'));

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          S
        </div>
        <div>
          <h1 className="font-semibold text-sm leading-tight">Суші Мастер</h1>
          <p className="text-xs text-muted-foreground">Адмін-панель</p>
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
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
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