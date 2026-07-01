import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        branch: { select: { name: true, address: true, phone: true } },
        items: { include: { product: { select: { imageUrl: true } } } },
        payments: true,
        promotion: { select: { name: true, type: true, value: true } },
      },
    });

    if (!order) return apiNotFound('Order not found');
    if (order.userId !== authUser.userId && authUser.role !== 'admin')
      return apiError('FORBIDDEN', 'You can only view your own orders', 403);

    return apiSuccess(order);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Get order error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch order', 500);
  }
}