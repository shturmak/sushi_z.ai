import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { cancelOrder } from '@/domain/order.service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;
    const result = await cancelOrder(id, authUser.userId);
    if (!result.success && result.error) return apiError('CANCEL_FAILED', result.error);
    return apiSuccess(null, 'Order cancelled');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Cancel order error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to cancel order', 500);
  }
}