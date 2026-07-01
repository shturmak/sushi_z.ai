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

    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!product || product.brandId !== ctx.brandId) {
      return apiError('FORBIDDEN', 'Resource not found', 404);
    }

    return apiSuccess(product);
  } catch (err) {
    return tenantCatch(err);
  }
}