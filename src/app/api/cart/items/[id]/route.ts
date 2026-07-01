import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return apiError('VALIDATION_ERROR', 'Valid quantity is required');
    }

    const cart = await db.cart.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
    });
    if (!cart) {
      return apiError('NO_CART', 'Cart does not exist', 404);
    }

    const cartItem = await db.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { product: true },
    });

    if (!cartItem) {
      return apiNotFound('Cart item not found');
    }

    // Recalculate total price with new quantity
    let optionPriceDelta = 0;
    if (cartItem.selectedOptions) {
      try {
        const opts = JSON.parse(cartItem.selectedOptions);
        if (Array.isArray(opts)) {
          for (const opt of opts) {
            if (opt.priceDelta) {
              optionPriceDelta += opt.priceDelta;
            }
          }
        }
      } catch {
        // ignore parse error
      }
    }

    const unitPrice = cartItem.product.price + optionPriceDelta;
    const totalPrice = unitPrice * quantity;

    const updated = await db.cartItem.update({
      where: { id },
      data: { quantity, totalPrice },
      include: { product: true },
    });

    return apiSuccess(updated, 'Cart item updated');
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
    const { id } = await params;

    const cart = await db.cart.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
    });
    if (!cart) {
      return apiError('NO_CART', 'Cart does not exist', 404);
    }

    const cartItem = await db.cartItem.findFirst({
      where: { id, cartId: cart.id },
    });

    if (!cartItem) {
      return apiNotFound('Cart item not found');
    }

    await db.cartItem.delete({ where: { id } });

    return apiSuccess(null, 'Cart item removed');
  } catch (err) {
    return tenantCatch(err);
  }
}