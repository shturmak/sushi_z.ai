import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { withTenant, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await withTenant(request);
    const { id } = await params;

    const branch = await db.branch.findUnique({
      where: { id },
      include: {
        deliveryZones: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { categories: true, products: true },
        },
      },
    });

    if (!branch || branch.brandId !== ctx.brandId) {
      return apiError('FORBIDDEN', 'Resource not found', 404);
    }

    return apiSuccess(branch);
  } catch (err) {
    return tenantCatch(err);
  }
}