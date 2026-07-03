import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const authUser = await requireAuth();

    const favorites = await db.favoriteProduct.findMany({
      where: { userId: authUser.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            weight: true,
            imageUrl: true,
            isAvailable: true,
            categoryId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(favorites);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('List favorites error:', error);
    return apiUnauthorized();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return apiError('VALIDATION_ERROR', 'productId is required');
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return apiError('NOT_FOUND', 'Product not found', 404);
    }

    const existing = await db.favoriteProduct.findUnique({
      where: { userId_productId: { userId: authUser.userId, productId } },
    });

    if (existing) {
      return apiSuccess(existing, 'Already favorited');
    }

    const favorite = await db.favoriteProduct.create({
      data: {
        userId: authUser.userId,
        brandId: product.brandId,
        productId,
      },
    });

    return apiSuccess(favorite, 'Added to favorites', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Add favorite error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to add favorite', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return apiError('VALIDATION_ERROR', 'productId is required');
    }

    const existing = await db.favoriteProduct.findUnique({
      where: { userId_productId: { userId: authUser.userId, productId } },
    });

    if (!existing) {
      return apiError('NOT_FOUND', 'Favorite not found', 404);
    }

    await db.favoriteProduct.delete({ where: { id: existing.id } });

    return apiSuccess(null, 'Removed from favorites');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Remove favorite error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to remove favorite', 500);
  }
}