'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import {
  storefrontBrand,
  storefrontCategories,
  storefrontProducts,
} from '@/lib/storefront-mock-data';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  quantity: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const brandColor = storefrontBrand.primaryColor;

function formatPrice(price: number): string {
  return `${price} ₴`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return storefrontProducts;
    return storefrontProducts.filter((p) => p.categoryId === selectedCategory);
  }, [selectedCategory]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, ci) => {
        const product = storefrontProducts.find((p) => p.id === ci.productId);
        return sum + (product ? product.price * ci.quantity : 0);
      }, 0),
    [cart],
  );

  const deliveryFee = subtotal > 0 ? 49 : 0;
  const total = subtotal + deliveryFee;

  const scrollToMenu = useCallback(() => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ─── Cart Actions ────────────────────────────────────────────────────────

  const addToCart = useCallback((productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md bg-background/80"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <UtensilsCrossed
              className="size-6"
              style={{ color: brandColor }}
            />
            <span className="text-lg font-bold tracking-tight">
              {storefrontBrand.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setCartOpen(true)}
            aria-label="Відкрити кошик"
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 z-10" style={{
            background: `linear-gradient(135deg, ${brandColor}e6 0%, ${brandColor}99 50%, ${brandColor}66 100%)`,
          }} />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Background image */}
          <div className="relative h-64 sm:h-80 md:h-96 w-full">
            <Image
              src="/hero-sushi.png"
              alt="Суші Мастер — свіжі роли та суші"
              fill
              className="object-cover object-center"
              priority
            />
          </div>

          {/* Hero content */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg leading-tight">
              {storefrontBrand.slogan}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md drop-shadow">
              Найсвіжіші роли, суші та страви японської кухні з доставкою до вашого дому
            </p>
            <Button
              size="lg"
              className="mt-6 text-base font-semibold px-8 h-12 rounded-full bg-white text-foreground hover:bg-white/90 shadow-lg cursor-pointer"
              onClick={scrollToMenu}
            >
              Замовити
            </Button>
          </div>
        </section>

        {/* ─── Categories ────────────────────────────────────────────────── */}
        <section ref={menuRef} className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
              <CategoryPill
                name="Усе"
                active={selectedCategory === null}
                onClick={() => setSelectedCategory(null)}
                brandColor={brandColor}
              />
              {storefrontCategories.map((cat) => (
                <CategoryPill
                  key={cat.id}
                  name={cat.name}
                  active={selectedCategory === cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  brandColor={brandColor}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ─── Products Grid ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          <h2 className="sr-only">Меню</h2>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ShoppingBag className="size-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">Немає товарів у цій категорії</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  brandColor={brandColor}
                  onAdd={() => addToCart(product.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ─── Sticky Bottom Cart Bar ──────────────────────────────────────── */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-3 sm:p-4">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="size-5" style={{ color: brandColor }} />
              <div>
                <p className="text-sm font-medium">
                  {cartCount}{' '}
                  {cartCount === 1
                    ? 'товар'
                    : cartCount < 5
                      ? 'товари'
                      : 'товарів'}
                </p>
                <p className="text-sm font-bold">{formatPrice(total)}</p>
              </div>
            </div>
            <Button
              className="rounded-full px-6 font-semibold shadow-md cursor-pointer"
              style={{ backgroundColor: brandColor, color: '#fff' }}
              onClick={() => setCartOpen(true)}
            >
              Переглянути кошик
            </Button>
          </div>
        </div>
      )}

      {/* ─── Cart Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="size-5" />
              Кошик
              {cartCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 text-xs"
                >
                  {cartCount}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-muted-foreground">
              <ShoppingBag className="size-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Кошик порожній</p>
              <p className="mt-1 text-sm text-center">
                Додайте щось смачне з нашого меню
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-1 px-4 py-3">
                  {cart.map((ci) => (
                    <CartRow
                      key={ci.productId}
                      item={ci}
                      brandColor={brandColor}
                      onUpdateQty={(d) => updateQuantity(ci.productId, d)}
                      onRemove={() => removeFromCart(ci.productId)}
                    />
                  ))}
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t">
                <div className="px-5 py-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Підсумок</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Доставка</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Разом</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                <SheetFooter className="px-5 pb-5 pt-0">
                  <Button
                    className="w-full h-12 rounded-full text-base font-semibold cursor-pointer"
                    style={{ backgroundColor: brandColor, color: '#fff' }}
                  >
                    Оформити замовлення
                  </Button>
                </SheetFooter>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t bg-foreground/[0.03]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UtensilsCrossed
              className="size-4"
              style={{ color: brandColor }}
            />
            <span className="font-semibold text-sm">
              {storefrontBrand.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {storefrontBrand.name}. Усі права захищені.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            powered by <span className="font-medium">SushiChain</span>
          </p>
        </div>
      </footer>

      {/* Bottom padding for sticky cart bar */}
      {cartCount > 0 && <div className="h-20" />}
    </div>
  );
}

// ─── CategoryPill ────────────────────────────────────────────────────────────

function CategoryPill({
  name,
  active,
  onClick,
  brandColor,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
  brandColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
      style={
        active
          ? { backgroundColor: brandColor, color: '#fff' }
          : { backgroundColor: 'transparent', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
      }
    >
      {name}
    </button>
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  brandColor,
  onAdd,
}: {
  product: (typeof storefrontProducts)[number];
  brandColor: string;
  onAdd: () => void;
}) {
  const unavailable = !product.isAvailable;

  return (
    <Card
      className={`relative overflow-hidden gap-0 py-0 rounded-2xl transition-shadow hover:shadow-md ${
        unavailable ? 'opacity-60' : ''
      }`}
    >
      {/* Image placeholder */}
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden rounded-t-2xl">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${brandColor}, transparent 70%)`,
          }}
        />
        <UtensilsCrossed
          className="size-10 text-muted-foreground/40"
        />
        {unavailable && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Badge
              variant="secondary"
              className="bg-black/60 text-white text-xs"
            >
              Немає в наявності
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="flex items-end justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold" style={{ color: brandColor }}>
              {formatPrice(product.price)}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {product.weight}
            </Badge>
          </div>
          {!unavailable && (
            <Button
              size="sm"
              className="rounded-full px-3 font-medium cursor-pointer"
              style={{ backgroundColor: brandColor, color: '#fff' }}
              onClick={onAdd}
            >
              <Plus className="size-3.5" />
              Додати
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CartRow ─────────────────────────────────────────────────────────────────

function CartRow({
  item,
  brandColor,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  brandColor: string;
  onUpdateQty: (delta: number) => void;
  onRemove: () => void;
}) {
  const product = storefrontProducts.find((p) => p.id === item.productId);
  if (!product) return null;

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Thumbnail placeholder */}
      <div className="shrink-0 size-14 rounded-xl bg-muted flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${brandColor}, transparent 70%)`,
          }}
        />
        <UtensilsCrossed className="size-5 text-muted-foreground/40" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">
          {product.name}
        </p>
        <p className="text-sm font-bold mt-0.5" style={{ color: brandColor }}>
          {formatPrice(product.price * item.quantity)}
        </p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onUpdateQty(-1)}
          className="flex size-7 items-center justify-center rounded-full border hover:bg-accent transition-colors cursor-pointer"
          aria-label="Зменшити"
        >
          <Minus className="size-3" />
        </button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQty(1)}
          className="flex size-7 items-center justify-center rounded-full border hover:bg-accent transition-colors cursor-pointer"
          aria-label="Збільшити"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex size-7 items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors ml-1 cursor-pointer"
          aria-label="Видалити"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}