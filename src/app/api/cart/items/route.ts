import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { productId, quantity, selectedOptions } = body;

    if (!productId || !quantity || quantity < 1) {
      return apiError('VALIDATION_ERROR', 'productId and valid quantity are required');
    }

    const cart = await db.cart.findUnique({ where: { userId: authUser.userId } });
    if (!cart) {
      return apiError('NO_CART', 'Cart does not exist. Create a cart first.', 404);
    }

    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isAvailable) {
      return apiError('NOT_FOUND', 'Product not found or unavailable', 404);
    }

    // Calculate option price deltas
    let optionPriceDelta = 0;
    if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
      for (const opt of selectedOptions) {
        if (opt.priceDelta) {
          optionPriceDelta += opt.priceDelta;
        }
      }
    }

    const unitPrice = product.price + optionPriceDelta;
    const totalPrice = unitPrice * quantity;

    const cartItem = await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
        selectedOptions: selectedOptions ? JSON.stringify(selectedOptions) : null,
        totalPrice,
      },
      include: { product: true },
    });

    return apiSuccess(cartItem, 'Item added to cart', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Add cart item error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to add item to cart', 500);
  }
}