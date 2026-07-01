'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, MapPin, Tag, LogOut, LogIn, UserPlus,
  Package, CreditCard, Star, ChevronRight, Clock, Phone, Mail, TrendingUp, DollarSign,
  ShoppingCart, X, Plus, Minus, RotateCcw, Ban, CheckCircle2, ChefHat, Truck, CircleDot,
  ArrowUpRight, ArrowDownRight, Store
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Status helpers ───
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  confirmed: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  cooking: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  delivering: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новий', confirmed: 'Підтверджено', cooking: 'Готується',
  ready: 'Готовий', delivering: 'Доставляється', completed: 'Виконано', cancelled: 'Скасовано',
};

const STATUS_ICONS: Record<string, any> = {
  new: CircleDot, confirmed: CheckCircle2, cooking: ChefHat, ready: Package, delivering: Truck, completed: CheckCircle2, cancelled: Ban,
};

const NEXT_STATUS: Record<string, string> = {
  new: 'confirmed', confirmed: 'cooking', cooking: 'ready', ready: 'delivering', delivering: 'completed',
};

const PAYMENT_METHODS: Record<string, string> = { card: 'Картка', cash: 'Готівка', bonus: 'Бонуси' };

// ─── LOGIN FORM ───
function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('admin@sushichain.ua');
  const [password, setPassword] = useState('12345678');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuth(s => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isRegister) {
      const { data, error } = await API.auth.register({ email, password, phone, firstName, lastName: '' });
      if (error) { toast.error(error); setLoading(false); return; }
      login(data);
      toast.success('Реєстрація успішна!');
    } else {
      const { data, error } = await API.auth.login(email, password);
      if (error) { toast.error(error); setLoading(false); return; }
      login(data);
      toast.success(`Вітаємо, ${data.user.firstName || data.user.email}!`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-3">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">СушіМастер</CardTitle>
          <CardDescription>Омніканальна система замовлень</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <>
                <Input placeholder="Ім'я" value={firstName} onChange={e => setFirstName(e.target.value)} />
                <Input placeholder="Телефон" value={phone} onChange={e => setPhone(e.target.value)} />
              </>
            )}
            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isRegister ? 'Зареєструватись' : 'Увійти'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <button onClick={() => setIsRegister(!isRegister)} className="text-orange-600 hover:underline font-medium">
              {isRegister ? 'Вже є акаунт? Увійти' : 'Немає акаунта? Зареєструватись'}
            </button>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Демо-доступ:</p>
            <p>Admin: admin@sushichain.ua / 12345678</p>
            <p>Client: customer@example.com / 12345678</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── DASHBOARD (Admin) ───
function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, o] = await Promise.all([
      API.admin.analytics(),
      API.admin.orders(),
    ]);
    if (a.data) setAnalytics(a.data);
    if (o.data) setOrders(o.data.orders || []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const handleStatusChange = async (orderId: string, status: string) => {
    const { error } = await API.admin.updateOrderStatus(orderId, status);
    if (error) { toast.error(error); return; }
    toast.success(`Статус оновлено: ${STATUS_LABELS[status]}`);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;

  const stats = analytics?.orders || { today: 0, week: 0, month: 0 };
  const rev = analytics?.revenue || { today: 0, week: 0, month: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Адмін-панель</h2>
        <p className="text-muted-foreground">Огляд діяльності мережі СушіМастер</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Замовлень сьогодні', value: stats.today, icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
          { label: 'Виручка сьогодні', value: `${rev.today.toFixed(0)} ₴`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'За тиждень', value: stats.week, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
          { label: 'Виручка за тиждень', value: `${rev.week.toFixed(0)} ₴`, icon: ArrowUpRight, color: 'text-purple-600 bg-purple-50' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${s.color}`}><s.icon className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Distribution + Top Products */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Замовлення за статусами</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(analytics?.statusDistribution || []).map((s: any) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className="text-sm">{STATUS_LABELS[s.status] || s.status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${orders.length ? (s.count / orders.length * 100) : 0}%` }} />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Топ-5 страв</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(analytics?.topProducts || []).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-500 w-5">#{i + 1}</span>
                    <span className="text-sm">{p.name}</span>
                  </div>
                  <span className="text-sm font-medium">{p.revenue?.toFixed(0)} ₴</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Останні замовлення</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {orders.map((o: any) => {
                const next = NEXT_STATUS[o.status];
                return (
                  <div key={o.id} className="border rounded-xl p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-orange-600">{o.orderNumber}</div>
                        <Badge variant="outline" className={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                        <span className="text-xs text-muted-foreground">{o.type === 'delivery' ? '🚗 Доставка' : '🏪 Самовивіз'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{o.total.toFixed(0)} ₴</span>
                        {next && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(o.id, next)}>
                            → {STATUS_LABELS[next]}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" />{o.user?.firstName} {o.user?.lastName}</span>
                      <span className="flex items-center gap-1"><Store className="w-3 h-3" />{o.branch?.name}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{o.user?.phone || '-'}</span>
                      <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{PAYMENT_METHODS[o.payments?.[0]?.method] || '-'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(o.createdAt).toLocaleString('uk-UA')}</span>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {o.items.slice(0, 4).map((item: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{item.productName} ×{item.quantity}</Badge>
                        ))}
                        {o.items.length > 4 && <Badge variant="secondary" className="text-xs">+{o.items.length - 4} ще</Badge>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── CUSTOMER: MENU VIEW ───
function CustomerMenu({ branches, menu, cart, onAddToCart }: any) {
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || '');
  const [menuData, setMenuData] = useState<any[]>([]);

  useEffect(() => {
    if (selectedBranch) {
      API.menu.byBranch(selectedBranch).then(r => {
        if (r.data) setMenuData(r.data);
      });
    }
  }, [selectedBranch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Меню</h2>
        <p className="text-muted-foreground">Оберіть заклад та зробіть замовлення</p>
      </div>

      {/* Branch selector */}
      <div className="flex gap-2 flex-wrap">
        {branches.map((b: any) => (
          <Button key={b.id} variant={selectedBranch === b.id ? 'default' : 'outline'} onClick={() => setSelectedBranch(b.id)}>
            <MapPin className="w-4 h-4 mr-1" />{b.name}
          </Button>
        ))}
      </div>

      {/* Categories + Products */}
      <div className="space-y-8">
        {menuData.map((cat: any) => (
          <div key={cat.id}>
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              {cat.name}
              {cat.description && <span className="text-sm font-normal text-muted-foreground">— {cat.description}</span>}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.products?.map((p: any) => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{p.name}</h4>
                        {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {p.weight && <span>{p.weight}</span>}
                          {p.calories && <span>{p.calories} ккал</span>}
                        </div>
                        {p.optionGroups?.length > 0 && (
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {p.optionGroups.map((g: any) => (
                              <Badge key={g.id} variant="secondary" className="text-xs">{g.name}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-lg font-bold text-orange-600">{p.price} ₴</div>
                        <Button size="sm" className="mt-2" onClick={() => onAddToCart(p, selectedBranch)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CUSTOMER: ORDERS VIEW ───
function CustomerOrders({ onRefresh }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.orders.list().then(r => {
      if (r.data) setOrders(r.data.orders || []);
      setLoading(false);
    });
  }, []);

  const handleCancel = async (id: string) => {
    const { error } = await API.orders.cancel(id);
    if (error) { toast.error(error); return; }
    toast.success('Замовлення скасовано');
    API.orders.list().then(r => { if (r.data) setOrders(r.data.orders || []); });
  };

  const handleRepeat = async (id: string) => {
    const { error } = await API.orders.repeat(id);
    if (error) { toast.error(error); return; }
    toast.success('Товари додано в корзину');
    onRefresh();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Мої замовлення</h2>
        <p className="text-muted-foreground">Історія та статус ваших замовлень</p>
      </div>
      {orders.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">У вас ще немає замовлень</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o: any) => {
            const StatusIcon = STATUS_ICONS[o.status] || CircleDot;
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-orange-50"><StatusIcon className="w-5 h-5 text-orange-600" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{o.orderNumber}</span>
                          <Badge variant="outline" className={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{o.branch?.name} • {new Date(o.createdAt).toLocaleString('uk-UA')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xl font-bold">{o.total.toFixed(0)} ₴</div>
                        <p className="text-xs text-muted-foreground">{o.items?.length} позицій</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {(o.status === 'new' || o.status === 'confirmed') && (
                          <Button size="sm" variant="destructive" onClick={() => handleCancel(o.id)} className="text-xs h-7">
                            <Ban className="w-3 h-3 mr-1" />Скасувати
                          </Button>
                        )}
                        {o.status === 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => handleRepeat(o.id)} className="text-xs h-7">
                            <RotateCcw className="w-3 h-3 mr-1" />Повторити
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {o.items && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-1">
                      {o.items.map((item: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{item.productName} ×{item.quantity}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CUSTOMER: CART VIEW ───
function CustomerCart({ cart, onRefresh }: any) {
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);
  const [placing, setPlacing] = useState(false);

  const handleValidatePromo = async () => {
    if (!promoCode) return;
    const subtotal = cart?.subtotal || 0;
    const { data, error } = await API.promotions.validate(promoCode, subtotal);
    if (error) { toast.error(error); setPromoResult(null); return; }
    setPromoResult(data);
    toast.success('Промокод дійсний!');
  };

  const handlePlaceOrder = async () => {
    if (!cart || !cart.items?.length) return;
    setPlacing(true);
    const { data, error } = await API.orders.create({
      branchId: cart.branchId,
      type: 'pickup',
      paymentMethod: 'cash',
    });
    if (error) { toast.error(error); setPlacing(false); return; }
    toast.success(`Замовлення ${data?.orderNumber} створено!`);
    onRefresh();
    setPlacing(false);
  };

  const handleClearCart = async () => {
    await API.cart.clear();
    onRefresh();
  };

  if (!cart || !cart.items?.length) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Корзина</h2>
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Корзина порожня. Додайте страви з меню.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Корзина</h2>
        <Button variant="ghost" size="sm" onClick={handleClearCart}><X className="w-4 h-4 mr-1" />Очистити</Button>
      </div>

      <div className="space-y-3">
        {cart.items.map((item: any) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium">{item.product?.name || 'Товар'}</h4>
                <p className="text-sm text-muted-foreground">{item.quantity} × {item.product?.price} ₴</p>
              </div>
              <div className="text-lg font-bold">{item.totalPrice.toFixed(0)} ₴</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promo code */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input placeholder="Промокод" value={promoCode} onChange={e => setPromoCode(e.target.value)} className="max-w-xs" />
            <Button variant="outline" onClick={handleValidatePromo}>Застосувати</Button>
          </div>
          {promoResult && (
            <p className="text-sm text-emerald-600 mt-2">✓ {promoResult.name}: знижка {promoResult.discount} ₴</p>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm"><span>Підсумок:</span><span>{cart.subtotal.toFixed(0)} ₴</span></div>
          {promoResult?.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600"><span>Знижка:</span><span>-{promoResult.discount.toFixed(0)} ₴</span></div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold"><span>Разом:</span><span>{(cart.subtotal - (promoResult?.discount || 0)).toFixed(0)} ₴</span></div>
          <Button className="w-full mt-2" size="lg" onClick={handlePlaceOrder} disabled={placing}>
            {placing ? 'Оформлення...' : 'Оформити замовлення'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN APP ───
export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [branches, setBranches] = useState<any[]>([]);
  const [cart, setCart] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [initDone, setInitDone] = useState(false);

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem('sc_token');
    const refresh = localStorage.getItem('sc_refresh');
    if (token && refresh) {
      useAuth.getState().setToken(token);
      API.auth.profile().then(({ data }) => {
        if (data) {
          useAuth.getState().login({ user: data, accessToken: token, refreshToken: refresh });
        } else {
          localStorage.removeItem('sc_token');
          localStorage.removeItem('sc_refresh');
        }
        setInitDone(true);
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitDone(true);
    }
  }, []);

  const refreshCart = useCallback(() => {
    API.cart.get().then(r => { if (r.data) setCart(r.data); else setCart(null); });
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    API.branches.list().then(r => { if (r.data) setBranches(r.data); });
    refreshCart();
    API.loyalty.get().then(r => { if (r.data) setLoyalty(r.data); });
  }, [isAuthenticated, refreshCart]);

  const handleAddToCart = async (product: any, branchId: string) => {
    // Ensure cart exists
    if (!cart) {
      const { error } = await API.cart.create(branchId);
      if (error) { toast.error(error); return; }
    }
    const { error } = await API.cart.addItem({ productId: product.id, quantity: 1 });
    if (error) { toast.error(error); return; }
    toast.success(`${product.name} додано в корзину`);
    refreshCart();
  };

  if (!initDone) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;

  if (!isAuthenticated) return <LoginForm />;

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">СушіМастер</span>
            {isAdmin && <Badge className="bg-orange-100 text-orange-700">Admin</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <UserPlus className="w-4 h-4" />
              <span>{user?.firstName} {user?.lastName}</span>
              {user?.email && <span className="hidden md:inline">({user.email})</span>}
            </div>
            {loyalty && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" />
                {loyalty.balance.toFixed(0)} бонусів
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={async () => {
              await API.auth.logout(useAuth.getState().refreshToken || '');
              logout();
              toast.success('До зустрічі!');
            }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0 mb-6">
            {isAdmin && <TabsTrigger value="dashboard" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"><LayoutDashboard className="w-4 h-4 mr-1.5" />Дашборд</TabsTrigger>}
            <TabsTrigger value="menu" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"><UtensilsCrossed className="w-4 h-4 mr-1.5" />Меню</TabsTrigger>
            <TabsTrigger value="cart" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 relative">
              <ShoppingCart className="w-4 h-4 mr-1.5" />Корзина
              {cart?.totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{cart.totalItems}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"><ShoppingBag className="w-4 h-4 mr-1.5" />Замовлення</TabsTrigger>
            <TabsTrigger value="promotions" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"><Tag className="w-4 h-4 mr-1.5" />Акції</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
          )}
          <TabsContent value="menu">
            <CustomerMenu branches={branches} cart={cart} onAddToCart={handleAddToCart} />
          </TabsContent>
          <TabsContent value="cart">
            <CustomerCart cart={cart} onRefresh={refreshCart} />
          </TabsContent>
          <TabsContent value="orders">
            <CustomerOrders onRefresh={refreshCart} />
          </TabsContent>
          <TabsContent value="promotions">
            <PromotionsView />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© 2024 СушіМастер — Омніканальна система замовлень</p>
          <p className="mt-1 sm:mt-0">Next.js 16 + Prisma + TypeScript • Production-Ready REST API</p>
        </div>
      </footer>
    </div>
  );
}

// ─── PROMOTIONS VIEW ───
function PromotionsView() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.promotions.list().then(r => {
      if (r.data) setPromotions(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Акції та промокоди</h2>
      {promotions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Наразі немає активних акцій</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {promotions.map((p: any) => (
            <Card key={p.id} className="border-2 border-dashed border-orange-200 bg-orange-50/30">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    {p.code && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-white border-2 border-dashed border-orange-300 rounded-lg px-3 py-1">
                        <Tag className="w-3 h-3 text-orange-500" />
                        <span className="font-mono font-bold text-orange-600">{p.code}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-white shrink-0">
                    {p.type === 'percentage' ? `-${p.value}%` : p.type === 'fixed' ? `-${p.value}₴` : p.type === 'free_delivery' ? 'Безкошт. доставка' : `+${p.value} бонусів`}
                  </Badge>
                </div>
                <div className="mt-3 text-xs text-muted-foreground flex gap-4">
                  {p.minOrder > 0 && <span>Мін. замовлення: {p.minOrder}₴</span>}
                  <span>Використано: {p.usedCount}{p.maxUses ? `/${p.maxUses}` : ''}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}