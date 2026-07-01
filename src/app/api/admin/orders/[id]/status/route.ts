import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { updateOrderStatus } from '@/domain/order.service';
import { OrderStatus } from '@prisma/client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    if (status) {
      if (!Object.values(OrderStatus).includes(status))
        return apiError('VALIDATION_ERROR', 'Invalid status');
      const result = await updateOrderStatus(id, status);
      if (!result.success) return apiError('TRANSITION_ERROR', result.error as string);
    }

    if (note !== undefined) {
      await (await import('@/lib/db')).db.order.update({ where: { id }, data: { note } });
    }

    return apiSuccess(null, 'Order updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}