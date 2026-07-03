'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, subDays, startOfMonth } from 'date-fns';
import { Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminPaginatedApi, adminPut } from '@/lib/admin-api';
import type { Order, OrderStatus } from '@/lib/admin-types';
import { PageHeader } from '@/components/admin/page-header';
import { OrderStatusBadge, PaymentMethodBadge } from '@/components/admin/status-badges';
import { TableSkeleton } from '@/components/admin/admin-skeletons';
import { useAdminAuth } from '@/lib/admin-auth';
import { useBrandStore } from '@/lib/brand-store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/i18n';

// ── Constants ───────────────────────────────────────────

const BRANCH_OPTIONS = [
  { value: 'br1', label: 'Суші Мастер — Хрещатик' },
  { value: 'br2', label: 'Суші Мастер — Оболонь' },
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['cooking', 'cancelled'],
  cooking: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function thirtyDaysAgo(): string {
  return format(subDays(new Date(), 30), 'yyyy-MM-dd');
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ── Component ───────────────────────────────────────────

export default function OrdersPage() {
  const t = useT();

  const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('admin.ordersAdmin.allStatuses') },
    { value: 'new', label: t('admin.ordersAdmin.statuses.new') },
    { value: 'confirmed', label: t('admin.ordersAdmin.statuses.confirmed') },
    { value: 'cooking', label: t('admin.ordersAdmin.statuses.cooking') },
    { value: 'ready', label: t('admin.ordersAdmin.statuses.ready') },
    { value: 'delivering', label: t('admin.ordersAdmin.statuses.delivering') },
    { value: 'completed', label: t('admin.ordersAdmin.statuses.completed') },
    { value: 'cancelled', label: t('admin.ordersAdmin.statuses.cancelled') },
  ];

  const STATUS_LABELS: Record<OrderStatus, string> = {
    new: t('admin.ordersAdmin.statuses.new'),
    confirmed: t('admin.ordersAdmin.statuses.confirmed'),
    cooking: t('admin.ordersAdmin.statuses.cooking'),
    ready: t('admin.ordersAdmin.statuses.ready'),
    delivering: t('admin.ordersAdmin.statuses.delivering'),
    completed: t('admin.ordersAdmin.statuses.completed'),
    cancelled: t('admin.ordersAdmin.statuses.cancelled'),
  };

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState<string>(todayStr);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build API path with date params
  const apiPath = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const qs = params.toString();
    return `/api/admin/orders${qs ? `?${qs}` : ''}`;
  }, [dateFrom, dateTo]);

  const { data: orders, loading, refetch } = useAdminPaginatedApi<Order>(apiPath);

  // Client-side filtering
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (branchFilter !== 'all' && order.branchId !== branchFilter) return false;
    return true;
  });

  // ── Status change handler ──

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setStatusChanging(true);
    try {
      await adminPut(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(STATUS_LABELS[newStatus]);
      await refetch();
      // Update the selected order if it's the same one
      if (selectedOrder?.id === orderId) {
        const updated = orders.find((o) => o.id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch {
      // error handled
    } finally {
      setStatusChanging(false);
    }
  };

  // ── CSV Export handler ──

  const handleExportCsv = useCallback(() => {
    setExporting(true);
    const token = useAdminAuth.getState().token;
    const brand = useBrandStore.getState().currentBrandId;

    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (branchFilter !== 'all') params.set('branchId', branchFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (brand) params.set('brandId', brand);

    const url = `/api/admin/orders/export?${params.toString()}`;

    fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `orders-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        toast.error('Export failed');
      })
      .finally(() => {
        setExporting(false);
      });
  }, [statusFilter, branchFilter, dateFrom, dateTo]);

  // ── Address parsing ──

  const parseAddress = (snapshot: string | null): Record<string, string> | null => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot);
    } catch {
      return null;
    }
  };

  // ── Render ──

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.ordersAdmin.title')} description="" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder={t('admin.ordersAdmin.branch')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.ordersAdmin.allBranches')}</SelectItem>
            {BRANCH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-[160px]"
          aria-label={t('admin.ordersAdmin.dateFrom')}
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-[160px]"
          aria-label={t('admin.ordersAdmin.dateTo')}
        />

        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={exporting}
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {t('admin.ordersAdmin.exportCsv')}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">{t('admin.ordersAdmin.orderNumber')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('admin.ordersAdmin.branch')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('admin.ordersAdmin.date')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('common.status')}</TableHead>
                <TableHead className="whitespace-nowrap text-right">{t('admin.ordersAdmin.amount')}</TableHead>
                <TableHead className="whitespace-nowrap">{t('admin.ordersAdmin.payment')}</TableHead>
                <TableHead className="whitespace-nowrap">—</TableHead>
                <TableHead className="whitespace-nowrap text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    {t('admin.ordersAdmin.noOrders')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{order.branch.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(order.createdAt), 'dd.MM.yy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {order.total} ₴
                    </TableCell>
                    <TableCell>
                      <PaymentMethodBadge method={order.payments[0]?.method || 'cash'} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {order.type === 'delivery' ? t('checkout.delivery') : t('checkout.pickup')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && <OrderDetailDialog order={selectedOrder} onStatusChange={handleStatusChange} statusChanging={statusChanging} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail Dialog Inner ─────────────────────────────────

function OrderDetailDialog({
  order,
  onStatusChange,
  statusChanging,
}: {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  statusChanging: boolean;
}) {
  const t = useT();
  const address = order.addressSnapshot ? parseAddress(order.addressSnapshot) : null;

  const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
    new: ['confirmed', 'cancelled'],
    confirmed: ['cooking', 'cancelled'],
    cooking: ['ready', 'cancelled'],
    ready: ['delivering', 'cancelled'],
    delivering: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  const STATUS_LABELS: Record<OrderStatus, string> = {
    new: t('admin.ordersAdmin.statuses.new'),
    confirmed: t('admin.ordersAdmin.statuses.confirmed'),
    cooking: t('admin.ordersAdmin.statuses.cooking'),
    ready: t('admin.ordersAdmin.statuses.ready'),
    delivering: t('admin.ordersAdmin.statuses.delivering'),
    completed: t('admin.ordersAdmin.statuses.completed'),
    cancelled: t('admin.ordersAdmin.statuses.cancelled'),
  };

  const nextStatuses = NEXT_STATUS[order.status];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 flex-wrap">
          {t('admin.ordersAdmin.orderDetails')} #{order.orderNumber}
          <OrderStatusBadge status={order.status} />
        </DialogTitle>
      </DialogHeader>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4">
        <InfoRow label={t('admin.ordersAdmin.branch')} value={order.branch.name} />
        <InfoRow
          label="—"
          value={order.type === 'delivery' ? t('checkout.delivery') : t('checkout.pickup')}
        />
        <InfoRow
          label="—"
          value={format(new Date(order.createdAt), 'dd.MM.yy HH:mm')}
        />
        <InfoRow
          label={t('admin.ordersAdmin.payment')}
          value={
            <PaymentMethodBadge method={order.payments[0]?.method || 'cash'} />
          }
        />
        {order.promotionCode && (
          <InfoRow label={t('admin.promotions.code')} value={order.promotionCode} />
        )}
      </div>

      {/* Items */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">{t('admin.ordersAdmin.items')}</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.products.name')}</TableHead>
                <TableHead className="text-center">—</TableHead>
                <TableHead className="text-right">{t('admin.ordersAdmin.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.totalPrice} ₴</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-2 text-sm">
          <span className="text-muted-foreground mr-2">{t('common.total')}:</span>
          <span className="font-bold text-base">{order.total} ₴</span>
        </div>
      </div>

      {/* Address (delivery only) */}
      {order.type === 'delivery' && address && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">{t('admin.ordersAdmin.address')}</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            {address.street && <p>{address.street}</p>}
            {address.building && <p>{address.building}</p>}
            {address.apartment && <p>{address.apartment}</p>}
            {address.comment && <p>{address.comment}</p>}
          </div>
        </div>
      )}

      {/* Customer */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-2">{t('admin.ordersAdmin.customer')}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {order.user.firstName} {order.user.lastName}
          </p>
          {order.user.phone && <p>{order.user.phone}</p>}
          {order.user.email && <p>{order.user.email}</p>}
        </div>
      </div>

      {/* Note */}
      {order.note && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">{t('admin.ordersAdmin.note')}</h3>
          <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">
            {order.note}
          </p>
        </div>
      )}

      {/* Status Timeline */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-3">{t('admin.ordersAdmin.statusHistory')}</h3>
        <div className="flex flex-wrap gap-2">
          <TimelineDot
            label={t('admin.ordersAdmin.statuses.new')}
            time={order.createdAt}
            active
          />
          <TimelineDot
            label={t('admin.ordersAdmin.statuses.confirmed')}
            time={order.confirmedAt}
            active={!!order.confirmedAt}
          />
          <TimelineDot
            label={t('admin.ordersAdmin.statuses.cooking')}
            time={order.cookingAt}
            active={!!order.cookingAt}
          />
          <TimelineDot
            label={t('admin.ordersAdmin.statuses.ready')}
            time={order.readyAt}
            active={!!order.readyAt}
          />
          <TimelineDot
            label={t('admin.ordersAdmin.statuses.delivering')}
            time={order.deliveringAt}
            active={!!order.deliveringAt}
          />
          <TimelineDot
            label={t('admin.ordersAdmin.statuses.completed')}
            time={order.completedAt}
            active={!!order.completedAt}
          />
          {order.cancelledAt && (
            <TimelineDot
              label={t('admin.ordersAdmin.statuses.cancelled')}
              time={order.cancelledAt}
              active
              variant="destructive"
            />
          )}
        </div>
      </div>

      {/* Status change buttons */}
      {nextStatuses.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-semibold mb-3">{t('admin.ordersAdmin.changeStatus')}</h3>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((ns) => (
              <Button
                key={ns}
                variant={ns === 'cancelled' ? 'destructive' : 'default'}
                size="sm"
                disabled={statusChanging}
                onClick={() => onStatusChange(order.id, ns)}
              >
                {STATUS_LABELS[ns]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Small helpers ───────────────────────────────────────

function parseAddress(snapshot: string | null): Record<string, string> | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TimelineDot({
  label,
  time,
  active,
  variant = 'default',
}: {
  label: string;
  time: string | null;
  active: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          active
            ? variant === 'destructive'
              ? 'bg-red-500'
              : 'bg-emerald-500'
            : 'bg-muted-foreground/30'
        }`}
      />
      <div className="text-xs">
        <span className={active ? 'font-medium' : 'text-muted-foreground'}>
          {label}
        </span>
        {time && active && (
          <span className="text-muted-foreground ml-1.5">
            {format(new Date(time), 'HH:mm')}
          </span>
        )}
      </div>
    </div>
  );
}