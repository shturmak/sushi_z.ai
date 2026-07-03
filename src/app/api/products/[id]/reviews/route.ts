import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';
import { Prisma } from '@prisma/client';

// GET /api/products/[id]/reviews — public, list approved reviews
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: productId } = await params;
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 10 });

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return apiNotFound('Product not found');

    const where: Prisma.ReviewWhereInput = {
      productId,
      isApproved: true,
    };

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          rating: true,
          comment: true,
          isAdminReply: true,
          createdAt: true,
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      db.review.count({ where }),
    ]);

    // Also fetch average rating and total approved count
    const aggregates = await db.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });

    return apiSuccess({
      ...paginateResult(reviews, total, page, limit),
      averageRating: aggregates._avg.rating ?? 0,
      totalApproved: aggregates._count,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

// POST /api/products/[id]/reviews — create review (auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id: productId } = await params;
    const body = await request.json();
    const { orderId, rating, comment } = body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return apiError('VALIDATION_ERROR', 'orderId and rating (1-5) are required');
    }

    // Validate product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return apiNotFound('Product not found');

    // Validate order belongs to user and is completed
    const order = await db.order.findFirst({
      where: { id: orderId, userId: user.id, status: 'completed' },
    });
    if (!order) {
      return apiError('VALIDATION_ERROR', 'Order not found, not completed, or does not belong to you');
    }

    // Validate order contains this product
    const orderItem = await db.orderItem.findFirst({
      where: { orderId, productId },
    });
    if (!orderItem) {
      return apiError('VALIDATION_ERROR', 'This product is not in the specified order');
    }

    // Check for duplicate review (one review per order per product)
    const existing = await db.review.findFirst({
      where: { userId: user.id, orderId, productId },
    });
    if (existing) {
      return apiError('CONFLICT', 'You have already reviewed this product from this order', 409);
    }

    const review = await db.review.create({
      data: {
        userId: user.id,
        brandId: product.brandId,
        productId,
        orderId,
        rating,
        comment: comment || null,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return apiSuccess(review, 'Review submitted', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}