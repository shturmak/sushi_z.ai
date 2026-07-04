import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const branchId = request.nextUrl.searchParams.get('branchId');

    if (!branchId) {
      return apiError('VALIDATION_ERROR', 'branchId is required');
    }

    // 1. Get user's past order product IDs
    const orderItems = await db.orderItem.findMany({
      where: {
        order: { userId: authUser.userId },
      },
      select: { productId: true },
      distinct: ['productId'],
    });
    const orderedProductIds = new Set(orderItems.map((oi) => oi.productId));

    // 2. Get user's favorite product IDs
    const favorites = await db.favoriteProduct.findMany({
      where: { userId: authUser.userId },
      select: { productId: true },
    });
    const favoriteProductIds = new Set(favorites.map((f) => f.productId));

    // 3. Get top 5 most-ordered products for this branch (popular)
    const orderItemAgg = await db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { branchId },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    });
    const popularProductIds = orderItemAgg.map((oi) => oi.productId);

    // 4. Fetch "ordered before" products (still available, belong to this branch)
    let orderedBefore: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      imageUrl: string | null;
      isAvailable: boolean;
    }> = [];

    if (orderedProductIds.size > 0) {
      orderedBefore = await db.product.findMany({
        where: {
          id: { in: Array.from(orderedProductIds) },
          isAvailable: true,
          category: { branchId },
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isAvailable: true,
        },
      });
    }

    // 5. Fetch "popular" products (top ordered, not yet ordered by user, available)
    const notOrderedPopular = popularProductIds.filter(
      (pid) => !orderedProductIds.has(pid)
    );

    let popular: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      imageUrl: string | null;
      isAvailable: boolean;
    }> = [];

    if (notOrderedPopular.length > 0) {
      popular = await db.product.findMany({
        where: {
          id: { in: notOrderedPopular },
          isAvailable: true,
          category: { branchId },
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isAvailable: true,
        },
        take: 5,
      });
    }

    return apiSuccess({ orderedBefore, popular });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error)
      return error as Response;
    console.error('Recommendations error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch recommendations', 500);
  }
}