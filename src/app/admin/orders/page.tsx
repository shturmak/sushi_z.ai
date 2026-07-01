'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminApi, adminPut } from '@/lib/admin-api';
import type { Order, OrderStatus } from '@/lib/admin-types';
import { PageHeader } from '@/components/admin/page-header';
import { OrderStatusBadge, PaymentMethodBadge } from '@/components/admin/status-badges';
import { TableSkeleton } from '@/components/admin/admin-skeletons';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

// ── Types ───────────────────────────────────────────────

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const ORDERS_DEFAULT: OrdersResponse = {
  orders: [],
  total: 0,
  page: 1,
  limit: 25,
  pages: 0,
};

// ── Constants ───────────────────────────────────────────

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Всі статуси' },
  { value: 'new', label: 'Новий' },
  { value: 'confirmed', label: 'Підтверджений' },
  { value: 'cooking', label: 'Готується' },
  { value: 'ready', label: 'Готовий' },
  { value: 'delivering', label: 'Доставляється' },
  { value: 'completed', label: 'Виконаний' },
  { value: 'cancelled', label: 'Скасований' },
];

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

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новий',
  confirmed: 'Підтверджений',
  cooking: 'Готується',
  ready: 'Готовий',
  delivering: 'Доставляється',
  completed: 'Виконаний',
  cancelled: 'Скасований',
};

// ── Component ───────────────────────────────────────────

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  const { data, loading, refetch } = useAdminApi<OrdersResponse>(
    '/api/admin/orders',
    ORDERS_DEFAULT,
  );

  // Client-side filtering
  const filteredOrders = data.orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (branchFilter !== 'all' && order.branchId !== branchFilter) return false;
    return true;
  });

  // ── Status change handler ──

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setStatusChanging(true);
    try {
      await adminPut(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Статус змінено на ${STATUS_LABELS[newStatus]}`);
      await refetch();
      // Update the selected order if it's the same one
      if (selectedOrder?.id === orderId) {
        const updated = data.orders.find((o) => o.id === orderId);
        if (updated) setSelectedOrder(updated);
      }
    } catch {
      toast.error('Не вдалося змінити статус');
    } finally {
      setStatusChanging(false);
    }
  };

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
      <PageHeader title="Замовлення" description="Управління замовленнями ресторану" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Статус" />
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
            <SelectValue placeholder="Філіал" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі філіали</SelectItem>
            {BRANCH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">№ замовлення</TableHead>
                <TableHead className="whitespace-nowrap">Філіал</TableHead>
                <TableHead className="whitespace-nowrap">Дата/час</TableHead>
                <TableHead className="whitespace-nowrap">Статус</TableHead>
                <TableHead className="whitespace-nowrap text-right">Сума</TableHead>
                <TableHead className="whitespace-nowrap">Оплата</TableHead>
                <TableHead className="whitespace-nowrap">Тип</TableHead>
                <TableHead className="whitespace-nowrap text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Замовлення не знайдено
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
                      {order.type === 'delivery' ? 'Доставка' : 'Самовивіз'}
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
  const address = order.addressSnapshot ? parseAddress(order.addressSnapshot) : null;
  const nextStatuses = NEXT_STATUS[order.status];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 flex-wrap">
          Замовлення #{order.orderNumber}
          <OrderStatusBadge status={order.status} />
        </DialogTitle>
      </DialogHeader>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-4">
        <InfoRow label="Філіал" value={order.branch.name} />
        <InfoRow
          label="Тип"
          value={order.type === 'delivery' ? 'Доставка' : 'Самовивіз'}
        />
        <InfoRow
          label="Створено"
          value={format(new Date(order.createdAt), 'dd.MM.yy HH:mm')}
        />
        <InfoRow
          label="Оплата"
          value={
            <PaymentMethodBadge method={order.payments[0]?.method || 'cash'} />
          }
        />
        {order.promotionCode && (
          <InfoRow label="Промокод" value={order.promotionCode} />
        )}
      </div>

      {/* Items */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Склад замовлення</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead className="text-center">Кількість</TableHead>
                <TableHead className="text-right">Сума</TableHead>
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
          <span className="text-muted-foreground mr-2">Разом:</span>
          <span className="font-bold text-base">{order.total} ₴</span>
        </div>
      </div>

      {/* Address (delivery only) */}
      {order.type === 'delivery' && address && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Адреса доставки</h3>
          <div className="text-sm space-y-1 text-muted-foreground">
            {address.street && <p>Вулиця: {address.street}</p>}
            {address.building && <p>Будинок: {address.building}</p>}
            {address.apartment && <p>Квартира: {address.apartment}</p>}
            {address.comment && <p>Коментар: {address.comment}</p>}
          </div>
        </div>
      )}

      {/* Customer */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-2">Клієнт</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            {order.user.firstName} {order.user.lastName}
          </p>
          {order.user.phone && <p>Телефон: {order.user.phone}</p>}
          {order.user.email && <p>Email: {order.user.email}</p>}
        </div>
      </div>

      {/* Note */}
      {order.note && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Примітка</h3>
          <p className="text-sm text-muted-foreground bg-muted rounded-md p-3">
            {order.note}
          </p>
        </div>
      )}

      {/* Status Timeline */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-3">Хронологія статусів</h3>
        <div className="flex flex-wrap gap-2">
          <TimelineDot
            label="Новий"
            time={order.createdAt}
            active
          />
          <TimelineDot
            label="Підтверджений"
            time={order.confirmedAt}
            active={!!order.confirmedAt}
          />
          <TimelineDot
            label="Готується"
            time={order.cookingAt}
            active={!!order.cookingAt}
          />
          <TimelineDot
            label="Готовий"
            time={order.readyAt}
            active={!!order.readyAt}
          />
          <TimelineDot
            label="Доставляється"
            time={order.deliveringAt}
            active={!!order.deliveringAt}
          />
          <TimelineDot
            label="Виконаний"
            time={order.completedAt}
            active={!!order.completedAt}
          />
          {order.cancelledAt && (
            <TimelineDot
              label="Скасований"
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
          <h3 className="text-sm font-semibold mb-3">Змінити статус</h3>
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