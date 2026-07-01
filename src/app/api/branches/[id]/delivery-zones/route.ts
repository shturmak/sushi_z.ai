import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenant, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenant(request);
    const { id } = await params;

    const branch = await db.branch.findUnique({ where: { id } });
    if (!branch || branch.brandId !== ctx.brandId) {
      return apiError('FORBIDDEN', 'Resource not found', 404);
    }

    const zones = await db.deliveryZone.findMany({
      where: { branchId: id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess(zones);
  } catch (err) {
    return tenantCatch(err);
  }
}