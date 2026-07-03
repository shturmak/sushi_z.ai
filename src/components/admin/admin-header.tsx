'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { AdminMobileSidebar } from './admin-mobile-sidebar';
import { useAdminAuth } from '@/lib/admin-auth';

export function AdminHeader() {
  const { theme, setTheme } = useTheme();
  const [quickStats, setQuickStats] = useState<{ orders: number; revenue: number } | null>(null);
  const token = useAdminAuth((s) => s.token);
  const isAuthenticated = useAdminAuth((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch('/api/admin/analytics?period=today', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setQuickStats({
            orders: json.data.orders.today ?? 0,
            revenue: json.data.revenue.today ?? 0,
          });
        }
      })
      .catch(() => {
        // Ignore — quick stats are non-critical
      });
  }, [isAuthenticated, token]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Меню</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Навігація</SheetTitle>
            <AdminMobileSidebar />
          </SheetContent>
        </Sheet>

        {/* Quick stats */}
        {quickStats && (
          <div className="hidden md:flex items-center text-xs text-muted-foreground">
            <span>
              {quickStats.orders} {quickStats.orders === 1 ? 'замовлення' : 'замовлень'}
              {', '}
              {quickStats.revenue.toLocaleString('uk-UA')} ₴
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Змінити тему</span>
        </Button>

        {/* Admin menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  АД
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Адмін</p>
                <p className="text-xs text-muted-foreground">admin@sushimaster.ua</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Профіль
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Вийти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}