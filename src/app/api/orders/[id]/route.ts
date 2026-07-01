import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenantAuth(request);
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

    if (!order || order.brandId !== ctx.brandId) {
      return apiError('FORBIDDEN', 'Resource not found', 404);
    }
    if (order.userId !== ctx.user.userId && ctx.user.role !== 'admin') {
      return apiError('FORBIDDEN', 'You can only view your own orders', 403);
    }

    return apiSuccess(order);
  } catch (err) {
    return tenantCatch(err);
  }
}