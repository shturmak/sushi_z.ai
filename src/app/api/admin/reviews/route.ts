import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';
import { Prisma } from '@prisma/client';

// GET /api/admin/reviews — list all reviews for the brand
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 25 });
    const status = request.nextUrl.searchParams.get('status');
    const productId = request.nextUrl.searchParams.get('productId');

    const where: Prisma.ReviewWhereInput = { brandId: admin.brandId };

    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }
    // 'all' or no status = no filter on isApproved

    if (productId) {
      where.productId = productId;
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      db.review.count({ where }),
    ]);

    // Count pending for badge
    const pendingCount = await db.review.count({
      where: { brandId: admin.brandId, isApproved: false },
    });

    return apiSuccess({
      ...paginateResult(reviews, total, page, limit),
      pendingCount,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}