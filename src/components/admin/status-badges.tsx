import { Badge } from '@/components/ui/badge';
import type { OrderStatus, PromotionType, PromotionStatus, PaymentMethod } from '@/lib/admin-types';
import { cn } from '@/lib/utils';

const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: 'Новий', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  confirmed: { label: 'Підтверджений', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  cooking: { label: 'Готується', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  ready: { label: 'Готовий', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  delivering: { label: 'Доставляється', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  completed: { label: 'Виконаний', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { label: 'Скасований', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const promoTypeConfig: Record<PromotionType, { label: string }> = {
  percentage: { label: '%' },
  fixed: { label: '₴' },
  free_delivery: { label: 'Доставка' },
  bonus: { label: 'Бонуси' },
};

const promoStatusConfig: Record<PromotionStatus, { label: string; className: string }> = {
  active: { label: 'Активна', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  inactive: { label: 'Неактивна', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
  expired: { label: 'Закінчилась', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const paymentMethodConfig: Record<PaymentMethod, { label: string }> = {
  card: { label: 'Картка' },
  cash: { label: 'Готівка' },
  bonus: { label: 'Бонуси' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = orderStatusConfig[status];
  return <Badge variant="outline" className={cn('font-medium border-0', config.className)}>{config.label}</Badge>;
}

export function PromotionTypeBadge({ type }: { type: PromotionType }) {
  return <Badge variant="secondary">{promoTypeConfig[type].label}</Badge>;
}

export function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
  const config = promoStatusConfig[status];
  return <Badge variant="outline" className={cn('font-medium border-0', config.className)}>{config.label}</Badge>;
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge variant="outline">{paymentMethodConfig[method].label}</Badge>;
}

export function ActiveToggleBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      Активний
    </Badge>
  ) : (
    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
      Вимкнений
    </Badge>
  );
}