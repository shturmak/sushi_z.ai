'use client';

import { useAdminApi } from '@/lib/admin-api';
import type { AdvancedAnalytics } from '@/lib/admin-types';
import { useT } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShoppingCart, BarChart3, ArrowRight } from 'lucide-react';

// ── Default data ───────────────────────────────────────────

const defaultData: AdvancedAnalytics = {
  customerSegments: [],
  ordersByHour: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0,
    revenue: 0,
  })),
  ordersByDayOfWeek: Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    count: 0,
    revenue: 0,
  })),
  checkoutFunnel: { carts: 0, checkouts: 0, completed: 0 },
  repeatRate: 0,
  totalCustomers: 0,
};

// ── Segment helpers ────────────────────────────────────────

const segmentMeta: Record<string, { rowClass: string; dotClass: string }> = {
  new: {
    rowClass: 'bg-blue-50 dark:bg-blue-950/30',
    dotClass: 'bg-blue-500',
  },
  returning_2_5: {
    rowClass: 'bg-green-50 dark:bg-green-950/30',
    dotClass: 'bg-green-500',
  },
  loyal_6_plus: {
    rowClass: 'bg-amber-50 dark:bg-amber-950/30',
    dotClass: 'bg-amber-500',
  },
  high_value: {
    rowClass: 'bg-rose-50 dark:bg-rose-950/30',
    dotClass: 'bg-rose-500',
  },
};

function segmentLabel(t: (key: string) => string, segment: string): string {
  switch (segment) {
    case 'new': return t('admin.advancedAnalytics.newCustomers');
    case 'returning_2_5': return t('admin.advancedAnalytics.returningCustomers');
    default: return segment.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ── Component ──────────────────────────────────────────────

export default function AdvancedAnalyticsPage() {
  const t = useT();
  const { data, loading } = useAdminApi<AdvancedAnalytics>(
    '/api/admin/analytics/advanced',
    defaultData,
  );

  const totalSpentAll = data.customerSegments.reduce((s, seg) => s + seg.totalSpent, 0);
  const totalCountAll = data.customerSegments.reduce((s, seg) => s + seg.count, 0);
  const avgCheckAll = totalCountAll > 0 ? totalSpentAll / totalCountAll : 0;

  // Peak hour
  const peakHour = data.ordersByHour.reduce(
    (best, h) => (h.count > best.count ? h : best),
    { hour: 0, count: 0, revenue: 0 },
  );
  const maxHourCount = Math.max(...data.ordersByHour.map((h) => h.count), 1);

  // Peak day
  const maxDayCount = Math.max(...data.ordersByDayOfWeek.map((d) => d.count), 1);

  // Funnel
  const { carts, checkouts, completed } = data.checkoutFunnel;
  const maxFunnel = Math.max(carts, 1);

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const days = t('admin.advancedAnalytics.days') as unknown as string[];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">{t('admin.advancedAnalytics.title')}</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* ── Card 1: Customer Segmentation (col-span-2) ──── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('admin.advancedAnalytics.customerSegmentation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Сегмент</TableHead>
                  <TableHead className="text-right">К-сть</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead className="text-right">
                    {t('admin.advancedAnalytics.avgCheckBySegment')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.customerSegments.map((seg) => {
                  const meta = segmentMeta[seg.segment];
                  return (
                    <TableRow key={seg.segment} className={meta?.rowClass ?? ''}>
                      <TableCell className="font-medium">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${meta?.dotClass ?? 'bg-gray-400'}`} />
                        {segmentLabel(t, seg.segment)}
                      </TableCell>
                      <TableCell className="text-right">{seg.count}</TableCell>
                      <TableCell className="text-right">
                        {seg.totalSpent.toLocaleString()} ₴
                      </TableCell>
                      <TableCell className="text-right">
                        {seg.avgCheck.toLocaleString()} ₴
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Card 2: Key Metrics ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ключові метрики
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total customers */}
            <div>
              <p className="text-sm text-muted-foreground">Усього клієнтів</p>
              <p className="text-4xl font-bold">{data.totalCustomers}</p>
            </div>

            {/* Repeat rate */}
            <div>
              <p className="text-sm text-muted-foreground">
                {t('admin.advancedAnalytics.repeatRate')}
              </p>
              <p className="text-2xl font-bold">{data.repeatRate}%</p>
              <Progress value={data.repeatRate} className="mt-2 h-2" />
            </div>

            {/* Avg check */}
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.analytics.avgCheck')}</p>
              <p className="text-2xl font-bold">{avgCheckAll.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₴</p>
            </div>

            {/* Peak hour */}
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.advancedAnalytics.ordersByHour')}</p>
              <p className="text-2xl font-bold">
                {peakHour.count > 0 ? `${peakHour.hour}:00` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Card 3: Checkout Funnel (full width) ────────── */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t('admin.advancedAnalytics.checkoutFunnel')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 sm:gap-4">
              {[
                { label: t('admin.advancedAnalytics.funnelCart'), value: carts },
                { label: t('admin.advancedAnalytics.funnelCheckout'), value: checkouts },
                { label: t('admin.advancedAnalytics.funnelCompleted'), value: completed },
              ].map((step, i) => {
                const widthPct = maxFunnel > 0 ? (step.value / maxFunnel) * 100 : 0;
                const prevValues = [carts, checkouts];
                const convRate =
                  i > 0 && prevValues[i - 1] > 0
                    ? ((step.value / prevValues[i - 1]) * 100).toFixed(1)
                    : null;

                return (
                  <div key={step.label} className="flex flex-1 items-center gap-2">
                    <div className="flex w-full flex-col items-center gap-1">
                      <span className="text-sm font-semibold">{step.value}</span>
                      <div
                        className="w-full rounded-md bg-primary/80 transition-all"
                        style={{ height: '32px', minWidth: `${Math.max(widthPct, 3)}%` }}
                      />
                      <span className="text-xs text-muted-foreground text-center leading-tight">
                        {step.label}
                      </span>
                    </div>

                    {i < 2 && convRate !== null && (
                      <div className="flex shrink-0 flex-col items-center gap-0.5">
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        <span className="text-xs text-muted-foreground">
                          {t('admin.advancedAnalytics.conversionRate')}: {convRate}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Card 4: Orders by Hour (col-span-2) ─────────── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('admin.advancedAnalytics.ordersByHour')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5" style={{ height: '180px' }}>
              {data.ordersByHour.map((h) => {
                const heightPct = (h.count / maxHourCount) * 100;
                const isPeak = h.hour === peakHour.hour && h.count > 0;
                return (
                  <div
                    key={h.hour}
                    className="group relative flex flex-1 flex-col items-center"
                  >
                    {/* Tooltip */}
                    {h.count > 0 && (
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-xs shadow opacity-0 transition-opacity group-hover:opacity-100">
                        {h.count} · {h.revenue.toLocaleString()} ₴
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t transition-colors ${
                        isPeak
                          ? 'bg-primary'
                          : 'bg-primary/30 hover:bg-primary/50'
                      }`}
                      style={{ height: `${Math.max(heightPct, 1)}%` }}
                    />
                    <span className={`mt-1 text-[10px] ${isPeak ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                      {h.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Card 5: Orders by Day of Week ───────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.advancedAnalytics.ordersByDayOfWeek')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2" style={{ height: '180px' }}>
              {data.ordersByDayOfWeek.map((d, idx) => {
                const heightPct = (d.count / maxDayCount) * 100;
                const isMax = d.count === maxDayCount && d.count > 0;
                return (
                  <div key={d.day} className="group relative flex flex-1 flex-col items-center">
                    {d.count > 0 && (
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-xs shadow opacity-0 transition-opacity group-hover:opacity-100">
                        {d.count}
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t transition-colors ${
                        isMax
                          ? 'bg-primary'
                          : 'bg-primary/30 hover:bg-primary/50'
                      }`}
                      style={{ height: `${Math.max(heightPct, 1)}%` }}
                    />
                    <span className={`mt-1 text-xs ${isMax ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                      {Array.isArray(days) ? days[idx] : d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}