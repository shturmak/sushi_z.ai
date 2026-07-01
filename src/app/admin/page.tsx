'use client';

import { ShoppingCart, DollarSign, Receipt, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

// ── Default analytics (all zeros / empty arrays) ──────────────────────
const defaultAnalytics: Analytics = {
  orders: { today: 0, week: 0, month: 0 },
  revenue: { today: 0, week: 0, month: 0 },
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

const orderTypeLabel: Record<OrderType, string> = {
  delivery: 'Доставка',
  pickup: 'Самовивіз',
};

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
            <span>за минулий тиждень</span>
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
  const { data, loading } = useAdminApi<Analytics>('/api/admin/analytics', defaultAnalytics);

  const avgCheck = data.orders.today > 0 ? Math.round(data.revenue.today / data.orders.today) : 0;
  const recentOrders = data.recentOrders.slice(0, 5);

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

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Аналітика</h1>
        <p className="text-muted-foreground">Огляд ключових показників вашого ресторану</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Замовлень сьогодні"
          value={String(data.orders.today)}
          icon={<ShoppingCart className="h-5 w-5" />}
          trend={{ value: '+12.5%', up: true }}
        />
        <MetricCard
          label="Виручка сьогодні"
          value={formatUAH(data.revenue.today)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: '+8.3%', up: true }}
        />
        <MetricCard
          label="Середній чек"
          value={formatUAH(avgCheck)}
          icon={<Receipt className="h-5 w-5" />}
          trend={{ value: '-2.1%', up: false }}
        />
        <MetricCard
          label="Замовлень за тиждень"
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
            <CardTitle className="text-base">Закази по днях</CardTitle>
            <CardDescription>Кількість замовлень за останні 14 днів</CardDescription>
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
                    name="Замовлення"
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
            <CardTitle className="text-base">Виручка по категоріях</CardTitle>
            <CardDescription>Розподіл виручки за категоріями товарів</CardDescription>
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
                  <Bar dataKey="revenue" name="Виручка" radius={[0, 4, 4, 0]}>
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
          <CardTitle className="text-base">Останні замовлення</CardTitle>
          <CardDescription>Останні 5 замовлень у системі</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер замовлення</TableHead>
                <TableHead>Філія</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сума</TableHead>
                <TableHead>Тип</TableHead>
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
                    Немає замовлень
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