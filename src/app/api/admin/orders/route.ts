import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { OrderStatus } from '@prisma/client';
import { parsePagination, paginateResult } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 25 });
    const status = request.nextUrl.searchParams.get('status');
    const branchId = request.nextUrl.searchParams.get('branchId');

    const where: Record<string, unknown> = {};
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) where.status = status;
    if (branchId) where.branchId = branchId;

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
          branch: { select: { name: true, address: true } },
          items: { select: { productName: true, quantity: true, totalPrice: true } },
          payments: { select: { method: true, status: true } },
        },
      }),
      db.order.count({ where }),
    ]);

    return apiSuccess(paginateResult(orders, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Admin orders error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}