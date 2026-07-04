// ============================================================
// Domain Layer: Order Service
// Business logic for order creation, status transitions, repeat
// ============================================================

import { db } from '@/lib/db';
import { OrderStatus, PaymentMethod, OrderType } from '@prisma/client';

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.new]: [OrderStatus.confirmed, OrderStatus.cancelled],
  [OrderStatus.confirmed]: [OrderStatus.cooking, OrderStatus.cancelled],
  [OrderStatus.cooking]: [OrderStatus.ready, OrderStatus.cancelled],
  [OrderStatus.ready]: [OrderStatus.delivering],
  [OrderStatus.delivering]: [OrderStatus.completed],
  [OrderStatus.completed]: [],
  [OrderStatus.cancelled]: [],
};

export function isValidTransition(current: string, next: string): boolean {
  return VALID_TRANSITIONS[current]?.includes(next as OrderStatus) ?? false;
}

const STATUS_TIMELINE_MAP: Record<string, string> = {
  confirmed: 'confirmedAt',
  cooking: 'cookingAt',
  ready: 'readyAt',
  delivering: 'deliveringAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
};

export interface CreateOrderParams {
  userId: string;
  branchId: string;
  type: OrderType;
  addressId?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  promotionCode?: string;
  useBonus?: number;
  scheduledAt?: string;
}

export async function createOrderFromCart(params: CreateOrderParams) {
  // 1. Get cart
  const cart = await db.cart.findUnique({
    where: { userId: params.userId },
    include: { items: { include: { product: true } }, branch: true },
  });

  if (!cart || cart.items.length === 0) {
    return { success: false as const, error: { code: 'EMPTY_CART', message: 'Cart is empty or does not exist' } };
  }

  if (cart.branchId !== params.branchId) {
    return { success: false as const, error: { code: 'BRANCH_MISMATCH', message: 'Cart branch does not match order branch' } };
  }

  // 2. Calculate subtotal
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // 3. Delivery fee
  let deliveryFee = 0;
  let addressSnapshot: string | null = null;
  let matchingZone: { estimatedMinutes: number } | undefined;

  if (params.type === OrderType.delivery) {
    if (!params.addressId) {
      return { success: false as const, error: { code: 'ADDRESS_REQUIRED', message: 'Delivery address is required' } };
    }
    const address = await db.userAddress.findUnique({ where: { id: params.addressId } });
    if (!address || address.userId !== params.userId) {
      return { success: false as const, error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' } };
    }
    addressSnapshot = JSON.stringify(address);

    const zones = await db.deliveryZone.findMany({ where: { branchId: params.branchId, isActive: true } });
    matchingZone = zones.filter(z => subtotal >= z.minOrder).sort((a, b) => b.minOrder - a.minOrder)[0];
    deliveryFee = matchingZone?.deliveryFee ?? 50;

    // Check minimum order amount for delivery
    const branch = await db.branch.findUnique({ where: { id: params.branchId } });
    if (branch?.minOrderAmount && subtotal < branch.minOrderAmount) {
      return { success: false as const, error: { code: 'MIN_ORDER_AMOUNT', message: `Minimum order amount is ${branch.minOrderAmount}₴` } };
    }
  }

  // 4. Validate promotion
  let discount = 0;
  let promotionId: string | null = null;

  if (params.promotionCode) {
    const promo = await db.promotion.findUnique({ where: { code: params.promotionCode } });
    if (!promo) return { success: false as const, error: { code: 'INVALID_PROMO', message: 'Promotion code not found' } };
    const now = new Date();
    if (promo.status !== 'active' || now < promo.startDate || now > promo.endDate)
      return { success: false as const, error: { code: 'PROMO_EXPIRED', message: 'Promotion is not active' } };
    if (promo.maxUses && promo.usedCount >= promo.maxUses)
      return { success: false as const, error: { code: 'PROMO_EXHAUSTED', message: 'Promotion usage limit reached' } };
    if (promo.minOrder && subtotal < promo.minOrder)
      return { success: false as const, error: { code: 'PROMO_MIN_ORDER', message: `Min order: ${promo.minOrder} UAH` } };

    if (promo.type === 'percentage') discount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
    else if (promo.type === 'fixed') discount = promo.value;
    else if (promo.type === 'free_delivery') deliveryFee = 0;
    promotionId = promo.id;

    await db.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
  }

  // 5. Handle bonus usage
  let bonusUsed = 0;
  if (params.useBonus && params.useBonus > 0) {
    const loyalty = await db.loyaltyAccount.findUnique({ where: { userId_brandId: { userId: params.userId, brandId: cart.brandId } } });
    if (!loyalty || loyalty.balance < params.useBonus)
      return { success: false as const, error: { code: 'INSUFFICIENT_BONUS', message: 'Not enough bonus points' } };
    bonusUsed = Math.min(params.useBonus, loyalty.balance, subtotal + deliveryFee - discount);
  }

  const total = Math.max(0, subtotal + deliveryFee - discount - bonusUsed);
  const orderCount = await db.order.count();
  const orderNumber = `#${(orderCount + 1001).toString()}`;
  const estimatedMinutes = params.type === OrderType.pickup ? 20 : 35;

  // 6. Transactional order creation
  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber, userId: params.userId, branchId: params.branchId,
        type: params.type, status: OrderStatus.new,
        addressSnapshot, deliveryFee, subtotal, discount, total,
        note: params.note || null, promotionId: promotionId ?? undefined,
        promotionCode: params.promotionCode || null, bonusUsed, estimatedMinutes,
        scheduledAt: params.scheduledAt ? new Date(params.scheduledAt) : undefined,
      },
    });

    for (const ci of cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id, productId: ci.productId,
          productName: ci.product.name, productPrice: ci.product.price,
          quantity: ci.quantity, selectedOptions: ci.selectedOptions,
          totalPrice: ci.totalPrice,
        },
      });
    }

    // Cash and bonus payments auto-succeed (collected on delivery / deducted immediately)
    const paymentStatus = (params.paymentMethod === 'cash' || params.paymentMethod === 'bonus') ? 'succeeded' as const : 'pending' as const;
    await tx.payment.create({
      data: { orderId: newOrder.id, method: params.paymentMethod, status: paymentStatus, amount: total },
    });

    // Deduct bonus
    if (bonusUsed > 0) {
      const loy = await tx.loyaltyAccount.findUnique({ where: { userId_brandId: { userId: params.userId, brandId: cart.brandId } } });
      if (loy) {
        const nb = Math.max(0, loy.balance - bonusUsed);
        await tx.loyaltyAccount.update({ where: { userId_brandId: { userId: params.userId, brandId: cart.brandId } }, data: { balance: nb } });
        await tx.loyaltyTransaction.create({
          data: { accountId: loy.id, type: 'spent' as const, amount: -bonusUsed, balanceAfter: nb,
            description: `Бонуси для ${orderNumber}`, relatedOrderId: newOrder.id },
        });
      }
    }

    // Earn bonus (5%)
    const earnLoy = await tx.loyaltyAccount.findUnique({ where: { userId_brandId: { userId: params.userId, brandId: cart.brandId } } });
    if (earnLoy) {
      const earned = Math.round(total * 0.05);
      const newLifetime = earnLoy.lifetime + total;
      const newBal = earnLoy.balance + earned; // bonusUsed already deducted above in the same tx
      const newTier = newLifetime >= 10000 ? 'gold' : newLifetime >= 3000 ? 'silver' : 'bronze';
      await tx.loyaltyAccount.update({ where: { userId_brandId: { userId: params.userId, brandId: cart.brandId } }, data: { balance: newBal, lifetime: newLifetime, tier: newTier } });
      await tx.loyaltyTransaction.create({
        data: { accountId: earnLoy.id, type: 'earned' as const, amount: earned, balanceAfter: newBal,
          description: `Бонуси за ${orderNumber}`, relatedOrderId: newOrder.id },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.delete({ where: { id: cart.id } });

    return newOrder;
  });

  // Auto-confirm orders when branch has autoConfirm enabled
  const branch = await db.branch.findUnique({ where: { id: params.branchId } });
  if (branch?.autoConfirm) {
    const estMinutes = params.type === OrderType.delivery
      ? (matchingZone?.estimatedMinutes ?? 30) + (branch.prepTimeMinutes ?? 30)
      : branch.prepTimeMinutes ?? 30;
    await db.order.update({
      where: { id: order.id },
      data: {
        status: 'confirmed' as const,
        confirmedAt: new Date(),
        estimatedMinutes: estMinutes,
      },
    });
    console.log(`[ORDER] Auto-confirmed ${orderNumber}, estimated: ${estMinutes}min`);
  }

  console.log(`[ORDER] Created ${orderNumber} for user ${params.userId}, total: ${total} UAH`);
  return {
    success: true as const,
    order: await db.order.findUnique({ where: { id: order.id }, include: { items: true, branch: true, payments: true } }),
  };
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false as const, error: 'Order not found' };
  if (!isValidTransition(order.status, newStatus))
    return { success: false as const, error: `Invalid transition: ${order.status} → ${newStatus}` };

  const timelineField = STATUS_TIMELINE_MAP[newStatus];
  const updateData: Record<string, unknown> = { status: newStatus };
  if (timelineField) updateData[timelineField] = new Date();

  const updated = await db.order.update({ where: { id: orderId }, data: updateData });
  console.log(`[ORDER] ${order.orderNumber}: ${order.status} → ${newStatus}`);
  return { success: true as const, order: updated };
}

export async function cancelOrder(orderId: string, userId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false as const, error: 'Order not found' };
  if (order.userId !== userId) return { success: false as const, error: 'Forbidden' };
  if (!isValidTransition(order.status, 'cancelled'))
    return { success: false as const, error: 'Order cannot be cancelled at this stage' };

  await db.order.update({ where: { id: orderId }, data: { status: 'cancelled', cancelledAt: new Date() } });

  if (order.bonusUsed > 0) {
    const loy = await db.loyaltyAccount.findUnique({ where: { userId_brandId: { userId, brandId: order.brandId } } });
    if (loy) {
      const nb = loy.balance + order.bonusUsed;
      await db.loyaltyAccount.update({ where: { userId_brandId: { userId, brandId: order.brandId } }, data: { balance: nb } });
      await db.loyaltyTransaction.create({
        data: { accountId: loy.id, type: 'adjusted' as const, amount: order.bonusUsed, balanceAfter: nb,
          description: `Повернення бонусів при скасуванні ${order.orderNumber}`, relatedOrderId: orderId },
      });
    }
  }
  console.log(`[ORDER] Cancelled ${order.orderNumber}`);
  return { success: true as const };
}

export async function repeatOrder(orderId: string, userId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { success: false as const, error: 'Order not found' };
  if (order.userId !== userId) return { success: false as const, error: 'Forbidden' };

  const available = [];
  for (const item of order.items) {
    const p = await db.product.findUnique({ where: { id: item.productId } });
    if (p?.isAvailable) available.push(item);
  }
  if (available.length === 0) return { success: false as const, error: 'No items available for reorder' };

  const existing = await db.cart.findUnique({ where: { userId } });
  if (existing) {
    await db.cartItem.deleteMany({ where: { cartId: existing.id } });
    await db.cart.delete({ where: { id: existing.id } });
  }

  const cart = await db.cart.create({ data: { userId, branchId: order.branchId } });
  for (const item of available) {
    await db.cartItem.create({
      data: { cartId: cart.id, productId: item.productId, quantity: item.quantity,
        selectedOptions: item.selectedOptions, totalPrice: item.totalPrice },
    });
  }

  return {
    success: true as const,
    cart: await db.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true } }, branch: true } }),
  };
}