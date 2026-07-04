import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, hashPassword } from '@/lib/auth';
import { OrderStatus, PaymentMethod, OrderType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      branchId,
      type,
      paymentMethod,
      addressData,
      items,
      note,
      promotionCode,
      scheduledAt,
    } = body;

    // ── Validation ───────────────────────────────────────
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      return apiError('VALIDATION_ERROR', 'firstName is required');
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return apiError('VALIDATION_ERROR', 'phone is required');
    }
    if (!branchId || typeof branchId !== 'string') {
      return apiError('VALIDATION_ERROR', 'branchId is required');
    }
    if (!type || !['delivery', 'pickup'].includes(type)) {
      return apiError('VALIDATION_ERROR', 'type must be "delivery" or "pickup"');
    }
    if (!paymentMethod || !['card', 'cash'].includes(paymentMethod)) {
      return apiError('VALIDATION_ERROR', 'paymentMethod must be "card" or "cash"');
    }
    if (!Array.isArray(items) || items.length === 0) {
      return apiError('VALIDATION_ERROR', 'items must be a non-empty array');
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return apiError('VALIDATION_ERROR', 'Each item must have productId and quantity >= 1');
      }
    }

    // ── Validate branch ──────────────────────────────────
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return apiError('NOT_FOUND', 'Branch not found');
    }

    // ── Create or find user by phone ─────────────────────
    let user = await db.user.findUnique({ where: { phone } });

    if (!user) {
      const randomPassword = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      user = await db.user.create({
        data: {
          phone,
          email: email || null,
          passwordHash: hashPassword(randomPassword),
          firstName: firstName.trim(),
          lastName: (lastName || '').trim(),
        },
      });
    }

    // ── Create loyalty account if needed ─────────────────
    const brandId = branch.brandId || '';
    let loyalty = await db.loyaltyAccount.findUnique({
      where: { userId_brandId: { userId: user.id, brandId } },
    });
    if (!loyalty) {
      loyalty = await db.loyaltyAccount.create({
        data: { userId: user.id, brandId },
      });
    }

    // ── Generate tokens ──────────────────────────────────
    const accessToken = await generateAccessToken({
      userId: user.id,
      role: user.role,
      phone: user.phone || undefined,
      email: user.email || undefined,
    });
    const refreshToken = await generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await db.userSession.create({
      data: { userId: user.id, refreshToken, expiresAt },
    });

    // ── Build order items and calculate subtotal ─────────
    let subtotal = 0;
    const orderItemsData: {
      productId: string;
      productName: string;
      productPrice: number;
      quantity: number;
      selectedOptions: string | null;
      totalPrice: number;
    }[] = [];

    for (const item of items) {
      const product = await db.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return apiError('NOT_FOUND', `Product ${item.productId} not found`);
      }
      if (!product.isAvailable) {
        return apiError('VALIDATION_ERROR', `Product "${product.name}" is not available`);
      }

      let itemTotal = product.price * item.quantity;

      // Calculate option price deltas
      if (item.selectedOptions) {
        const optionIds: string[] = JSON.parse(
          typeof item.selectedOptions === 'string'
            ? item.selectedOptions
            : JSON.stringify(item.selectedOptions)
        );
        for (const optId of optionIds) {
          const opt = await db.productOption.findUnique({ where: { id: optId } });
          if (opt) {
            itemTotal += opt.priceDelta * item.quantity;
          }
        }
      }

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions
          ? (typeof item.selectedOptions === 'string'
              ? item.selectedOptions
              : JSON.stringify(item.selectedOptions))
          : null,
        totalPrice: Math.round(itemTotal * 100) / 100,
      });
      subtotal += itemTotal;
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // ── Delivery fee ─────────────────────────────────────
    let deliveryFee = 0;
    let addressSnapshot: string | null = null;

    if (type === 'delivery') {
      addressSnapshot = addressData ? JSON.stringify(addressData) : null;
      const zones = await db.deliveryZone.findMany({
        where: { branchId, isActive: true },
      });
      const matchingZone = zones
        .filter((z) => subtotal >= z.minOrder)
        .sort((a, b) => b.minOrder - a.minOrder)[0];
      deliveryFee = matchingZone?.deliveryFee ?? 50;
    }

    // ── Validate promotion ───────────────────────────────
    let discount = 0;
    let promotionId: string | null = null;

    if (promotionCode) {
      const promo = await db.promotion.findUnique({ where: { code: promotionCode } });
      if (!promo) return apiError('INVALID_PROMO', 'Promotion code not found');
      const now = new Date();
      if (promo.status !== 'active' || now < promo.startDate || now > promo.endDate)
        return apiError('PROMO_EXPIRED', 'Promotion is not active');
      if (promo.maxUses && promo.usedCount >= promo.maxUses)
        return apiError('PROMO_EXHAUSTED', 'Promotion usage limit reached');
      if (promo.minOrder && subtotal < promo.minOrder)
        return apiError('PROMO_MIN_ORDER', `Min order: ${promo.minOrder} UAH`);

      if (promo.type === 'percentage') discount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
      else if (promo.type === 'fixed') discount = promo.value;
      else if (promo.type === 'free_delivery') deliveryFee = 0;
      promotionId = promo.id;

      await db.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);
    const orderCount = await db.order.count();
    const orderNumber = `#${(orderCount + 1001).toString()}`;
    const estimatedMinutes = type === OrderType.pickup ? 20 : 35;

    // ── Transactional order creation ─────────────────────
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          branchId,
          type: type as OrderType,
          status: OrderStatus.new,
          addressSnapshot,
          deliveryFee,
          subtotal,
          discount,
          total,
          note: note || null,
          promotionId: promotionId ?? undefined,
          promotionCode: promotionCode || null,
          bonusUsed: 0,
          estimatedMinutes,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });

      for (const oi of orderItemsData) {
        await tx.orderItem.create({
          data: { orderId: newOrder.id, ...oi },
        });
      }

      // Payment status
      const paymentStatus =
        (paymentMethod as PaymentMethod) === PaymentMethod.cash ? 'succeeded' : 'pending';

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          method: paymentMethod as PaymentMethod,
          status: paymentStatus as 'succeeded' | 'pending',
          amount: total,
        },
      });

      // Earn bonus (5%)
      if (loyalty) {
        const earned = Math.round(total * 0.05);
        const newLifetime = loyalty.lifetime + total;
        const newBal = loyalty.balance + earned;
        const newTier =
          newLifetime >= 10000 ? 'gold' : newLifetime >= 3000 ? 'silver' : 'bronze';
        await tx.loyaltyAccount.update({
          where: { userId_brandId: { userId: user.id, brandId } },
          data: { balance: newBal, lifetime: newLifetime, tier: newTier },
        });
        await tx.loyaltyTransaction.create({
          data: {
            accountId: loyalty.id,
            type: 'earned' as const,
            amount: earned,
            balanceAfter: newBal,
            description: `Бонуси за ${orderNumber}`,
            relatedOrderId: newOrder.id,
          },
        });
      }

      return newOrder;
    });

    const fullOrder = await db.order.findUnique({
      where: { id: order.id },
      include: { items: true, branch: true, payments: true },
    });

    console.log(`[GUEST ORDER] Created ${orderNumber} for new user ${user.id}, total: ${total} UAH`);

    return apiSuccess(
      {
        order: fullOrder,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
        refreshToken,
        loyalty: {
          balance: loyalty.balance,
          tier: loyalty.tier,
        },
      },
      'Guest order created successfully',
      201
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Guest order error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create guest order', 500);
  }
}