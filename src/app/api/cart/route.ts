import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const authUser = await requireAuth();

    const cart = await db.cart.findFirst({
      where: { userId: authUser.userId },
      include: {
        branch: true,
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      return apiSuccess(null);
    }

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    return apiSuccess({
      ...cart,
      totalItems,
      subtotal,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Get cart error:', error);
    return apiUnauthorized();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { branchId } = body;

    if (!branchId) {
      return apiError('VALIDATION_ERROR', 'branchId is required');
    }

    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return apiNotFound('Branch not found');
    }

    const brandId = branch.brandId;

    const existing = await db.cart.findUnique({ where: { userId_brandId: { userId: authUser.userId, brandId } } });
    if (existing) {
      return apiError('CONFLICT', 'Cart already exists. Clear it first or use the existing one.', 409);
    }

    const cart = await db.cart.create({
      data: {
        userId: authUser.userId,
        brandId,
        branchId,
      },
      include: { branch: true, items: true },
    });

    return apiSuccess(cart, 'Cart created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create cart error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to create cart', 500);
  }
}

export async function DELETE() {
  try {
    const authUser = await requireAuth();

    const cart = await db.cart.findFirst({ where: { userId: authUser.userId } });
    if (!cart) {
      return apiSuccess(null, 'No cart to clear');
    }

    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    await db.cart.delete({ where: { id: cart.id } });

    return apiSuccess(null, 'Cart cleared');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Clear cart error:', error);
    return apiUnauthorized();
  }
}