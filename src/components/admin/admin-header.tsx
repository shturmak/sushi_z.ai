'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, LogOut, User, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { AdminMobileSidebar } from './admin-mobile-sidebar';
import { useBrandStore } from '@/lib/brand-store';
import { useAdminApi } from '@/lib/admin-api';
import type { Brand } from '@/lib/admin-types';

export function AdminHeader() {
  const { theme, setTheme } = useTheme();
  const { currentBrand, setCurrentBrand, clearBrand } = useBrandStore();

  // Hardcoded super_admin role for now (will come from auth context later)
  const role = 'super_admin';

  const { data: brands } = useAdminApi<Brand[]>('/api/admin/brands', []);

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

        {/* Brand Selector (super_admin only) */}
        {role === 'super_admin' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2 font-normal">
                {currentBrand ? (
                  <>
                    <div
                      className="w-3.5 h-3.5 rounded-full border shrink-0"
                      style={{ backgroundColor: currentBrand.primaryColor }}
                    />
                    <span className="max-w-[140px] truncate hidden sm:inline">
                      {currentBrand.name}
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Усі бренди</span>
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Оберіть бренд</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => clearBrand()}>
                <span className="flex-1">Усі бренди</span>
                {!currentBrand && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {brands.map((brand) => (
                <DropdownMenuItem
                  key={brand.id}
                  onClick={() =>
                    setCurrentBrand({
                      id: brand.id,
                      name: brand.name,
                      slug: brand.slug,
                      primaryColor: brand.primaryColor,
                      secondaryColor: brand.secondaryColor,
                      logoUrl: brand.logoUrl,
                    })
                  }
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full border shrink-0 mr-2"
                    style={{ backgroundColor: brand.primaryColor }}
                  />
                  <span className="flex-1">{brand.name}</span>
                  {currentBrand?.id === brand.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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