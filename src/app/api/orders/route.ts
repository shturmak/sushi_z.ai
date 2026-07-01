import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createOrderFromCart } from '@/domain/order.service';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { userId: authUser.userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          branch: { select: { name: true, address: true } },
          items: true,
          payments: { select: { method: true, status: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    return apiSuccess({ orders, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('List orders error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch orders', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { branchId, type, addressId, paymentMethod, note, promotionCode, useBonus } = body;

    if (!branchId || !type || !paymentMethod) {
      return apiError('VALIDATION_ERROR', 'branchId, type, and paymentMethod are required');
    }
    if (!['delivery', 'pickup'].includes(type)) {
      return apiError('VALIDATION_ERROR', 'type must be "delivery" or "pickup"');
    }
    if (!['card', 'cash', 'bonus'].includes(paymentMethod)) {
      return apiError('VALIDATION_ERROR', 'paymentMethod must be card, cash, or bonus');
    }

    const result = await createOrderFromCart({
      userId: authUser.userId,
      branchId, type, addressId, paymentMethod, note, promotionCode, useBonus,
    });

    if (!result.success && result.error) {
      return apiError(result.error.code, result.error.message);
    }

    return apiSuccess(result.order, 'Order created successfully', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create order error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create order', 500);
  }
}