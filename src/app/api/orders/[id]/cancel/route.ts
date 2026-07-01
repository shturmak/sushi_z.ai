import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';
import { cancelOrder } from '@/domain/order.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
    const { id } = await params;

    // Verify order belongs to the brand
    const order = await db.order.findUnique({ where: { id } });
    if (!order || order.brandId !== ctx.brandId) {
      return apiError('FORBIDDEN', 'Resource not found', 404);
    }

    const result = await cancelOrder(id, ctx.user.userId);
    if (!result.success && result.error) return apiError('CANCEL_FAILED', result.error);
    return apiSuccess(null, 'Order cancelled');
  } catch (err) {
    return tenantCatch(err);
  }
}