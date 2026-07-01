import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { updateOrderStatus } from '@/domain/order.service';
import { OrderStatus } from '@prisma/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return apiError('VALIDATION_ERROR', `Invalid status. Must be one of: ${Object.values(OrderStatus).join(', ')}`);
    }

    const result = await updateOrderStatus(id, status);
    if (!result.success && result.error) return apiError('INVALID_TRANSITION', result.error);

    return apiSuccess(result.order, 'Order status updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Update order status error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to update order status', 500);
  }
}