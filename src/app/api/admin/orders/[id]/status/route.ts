import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';
import { db } from '@/lib/db';
import { updateOrderStatus } from '@/domain/order.service';
import { OrderStatus } from '@prisma/client';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { status, note } = body;

    // Verify order belongs to a branch of this brand
    const order = await db.order.findUnique({
      where: { id },
      include: { branch: { select: { brandId: true } } },
    });
    if (!order || order.branch.brandId !== ctx.brandId) return apiNotFound('Order not found');

    if (status) {
      if (!Object.values(OrderStatus).includes(status))
        return apiError('VALIDATION_ERROR', 'Invalid status');
      const result = await updateOrderStatus(id, status);
      if (!result.success) return apiError('TRANSITION_ERROR', result.error as string);
    }

    if (note !== undefined) {
      await db.order.update({ where: { id }, data: { note } });
    }

    return apiSuccess(null, 'Order updated');
  } catch (err) {
    return tenantCatch(err);
  }
}