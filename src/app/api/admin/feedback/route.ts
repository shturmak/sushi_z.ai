import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';
import { Prisma } from '@prisma/client';

// GET /api/admin/feedback — list feedback with pagination and filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 25 });
    const status = request.nextUrl.searchParams.get('status');
    const type = request.nextUrl.searchParams.get('type');
    const brandId = request.nextUrl.searchParams.get('brandId');

    if (!brandId) {
      return apiError('VALIDATION_ERROR', 'brandId query param is required');
    }

    const where: Prisma.FeedbackWhereInput = { brandId };

    if (status && status !== 'all') {
      where.status = status as Prisma.EnumFeedbackStatusFilter['equals'];
    }
    if (type && type !== 'all') {
      where.type = type as Prisma.EnumFeedbackTypeFilter['equals'];
    }

    const [feedbacks, total] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true } },
          branch: { select: { name: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      db.feedback.count({ where }),
    ]);

    return apiSuccess(paginateResult(feedbacks, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed to fetch feedback', 500);
  }
}