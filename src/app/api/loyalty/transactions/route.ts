import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/lib/db';
import { parsePagination, paginateResult } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const brandId = request.nextUrl.searchParams.get('brandId') || '';
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 20 });
    const loyalty = await db.loyaltyAccount.findUnique({ where: { userId_brandId: { userId: authUser.userId, brandId } } });
    if (!loyalty) return apiSuccess(paginateResult([], 0, page, limit));

    const where = { accountId: loyalty.id };
    const [transactions, total] = await Promise.all([
      db.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.loyaltyTransaction.count({ where }),
    ]);
    return apiSuccess(paginateResult(transactions, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Loyalty transactions error:', error);
    return apiSuccess([]);
  }
}