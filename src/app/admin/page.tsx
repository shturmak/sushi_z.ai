'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart, DollarSign, Receipt, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAdminApi } from '@/lib/admin-api';
import type { Analytics, OrderType } from '@/lib/admin-types';
import { OrderStatusBadge } from '@/components/admin/status-badges';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useT } from '@/i18n';

// ── Period type ────────────────────────────────────────────────────────
type PeriodKey = 'today' | '7d' | '30d' | 'month' | 'custom';

// ── Default analytics (all zeros / empty arrays) ──────────────────────
const defaultAnalytics: Analytics = {
  orders: { today: 0, week: 0, month: 0, range: 0 },
  revenue: { today: 0, week: 0, month: 0, range: 0 },
  statusDistribution: [],
  topProducts: [],
  recentOrders: [],
  ordersByDay: [],
  revenueByCategory: [],
};

// ── Helpers ───────────────────────────────────────────────────────────
function formatUAH(value: number): string {
  return `${value.toLocaleString('uk-UA')} ₴`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

// ── Metric card skeleton ──────────────────────────────────────────────
function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

// ── Metric card ───────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
}

function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend.up ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={trend.up ? 'text-emerald-600' : 'text-red-600'}>
              {trend.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Chart skeleton ────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <Card className="h-[360px]">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}

// ── Custom tooltip for charts ─────────────────────────────────────────
function ChartTooltipContent({ active, payload, label, isRevenue = false }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  isRevenue?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {isRevenue ? formatUAH(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const t = useT();

  const [period, setPeriod] = useState<PeriodKey>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Build API path with period params
  const apiPath = useMemo(() => {
    if (period === 'custom' && (customFrom || customTo)) {
      const params = new URLSearchParams();
      if (customFrom) params.set('dateFrom', customFrom);
      if (customTo) params.set('dateTo', customTo);
      return `/api/admin/analytics?${params.toString()}`;
    }
    if (period !== 'custom') {
      return `/api/admin/analytics?period=${period}`;
    }
    return '/api/admin/analytics?period=7d';
  }, [period, customFrom, customTo]);

  const { data, loading } = useAdminApi<Analytics>(apiPath, defaultAnalytics);

  const orderTypeLabel: Record<OrderType, string> = {
    delivery: t('checkout.delivery'),
    pickup: t('checkout.pickup'),
  };

  // Pick the right bucket for the selected period
  const periodOrders = data.orders.range ?? (period === 'today' ? data.orders.today : period === 'month' ? data.orders.month : data.orders.week);
  const periodRevenue = data.revenue.range ?? (period === 'today' ? data.revenue.today : period === 'month' ? data.revenue.month : data.revenue.week);

  const avgCheck = periodOrders > 0 ? Math.round(periodRevenue / periodOrders) : 0;
  const recentOrders = data.recentOrders.slice(0, 5);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today': return t('admin.ordersAdmin.today');
      case '7d': return t('admin.ordersAdmin.last7days');
      case '30d': return t('admin.ordersAdmin.last30days');
      case 'month': return t('admin.ordersAdmin.thisMonth');
      case 'custom': return t('admin.ordersAdmin.customRange');
    }
  }, [period, t]);

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Chart color tokens ──────────────────────────────────────────────
  const lineColor = 'hsl(var(--chart-1))';
  const barColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-1) / 0.5)',
  ];

  const periodButtons: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: t('admin.ordersAdmin.today') },
    { key: '7d', label: t('admin.ordersAdmin.last7days') },
    { key: '30d', label: t('admin.ordersAdmin.last30days') },
    { key: 'month', label: t('admin.ordersAdmin.thisMonth') },
    { key: 'custom', label: t('admin.ordersAdmin.customRange') },
  ];

  return (
    <div className="space-y-6">
      {/* Page heading with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('admin.analytics.title')}
            <span className="text-muted-foreground text-base font-normal ml-2">
              — {periodLabel}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {periodButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={period === btn.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom date range inputs */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">{t('admin.ordersAdmin.dateFrom')}</label>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-[160px]"
          />
          <label className="text-sm text-muted-foreground">{t('admin.ordersAdmin.dateTo')}</label>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t('admin.analytics.totalOrders')}
          value={String(periodOrders)}
          icon={<ShoppingCart className="h-5 w-5" />}
          trend={{ value: '+12.5%', up: true }}
        />
        <MetricCard
          label={t('admin.analytics.revenue')}
          value={formatUAH(periodRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: '+8.3%', up: true }}
        />
        <MetricCard
          label={t('admin.analytics.avgCheck')}
          value={formatUAH(avgCheck)}
          icon={<Receipt className="h-5 w-5" />}
          trend={{ value: '-2.1%', up: false }}
        />
        <MetricCard
          label={t('admin.analytics.activePromos')}
          value={String(data.orders.week)}
          icon={<CalendarDays className="h-5 w-5" />}
          trend={{ value: '+5.7%', up: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders by day — Line chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.analytics.ordersByDay')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.ordersByDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateLabel}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltipContent />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={{ r: 4, fill: lineColor }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by category — Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('admin.analytics.revenueByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByCategory ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}к`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    width={110}
                  />
                  <Tooltip
                    content={
                      <ChartTooltipContent isRevenue />
                    }
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {(data.revenueByCategory ?? []).map((_, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={barColors[index % barColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.analytics.recentOrders')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.ordersAdmin.orderNumber')}</TableHead>
                <TableHead>{t('admin.ordersAdmin.branch')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('admin.ordersAdmin.amount')}</TableHead>
                <TableHead>{t('common.all')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.branch.name}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatUAH(order.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {orderTypeLabel[order.type]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}