import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { repeatOrder } from '@/domain/order.service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;
    const result = await repeatOrder(id, authUser.userId);
    if (!result.success && result.error) return apiError('REORDER_FAILED', result.error);
    return apiSuccess(result.cart, 'Cart populated from previous order');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Repeat order error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to repeat order', 500);
  }
}