import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);

    const cart = await db.cart.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
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
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);
    const body = await request.json();
    const { branchId } = body;

    if (!branchId) {
      return apiError('VALIDATION_ERROR', 'branchId is required');
    }

    // Verify branch belongs to current brand
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.brandId !== ctx.brandId) {
      return apiNotFound('Branch not found');
    }

    const existing = await db.cart.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
    });
    if (existing) {
      return apiError('CONFLICT', 'Cart already exists. Clear it first or use the existing one.', 409);
    }

    const cart = await db.cart.create({
      data: {
        userId: ctx.user.userId,
        brandId: ctx.brandId,
        branchId,
      },
      include: { branch: true, items: true },
    });

    return apiSuccess(cart, 'Cart created', 201);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);

    const cart = await db.cart.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
    });
    if (!cart) {
      return apiSuccess(null, 'No cart to clear');
    }

    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    await db.cart.delete({ where: { id: cart.id } });

    return apiSuccess(null, 'Cart cleared');
  } catch (err) {
    return tenantCatch(err);
  }
}