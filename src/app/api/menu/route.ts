import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenant, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenant(request);
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return apiError('VALIDATION_ERROR', 'branchId query parameter is required');
    }

    // Verify the branch belongs to the current brand
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.brandId !== ctx.brandId) {
      return apiError('NOT_FOUND', 'Branch not found', 404);
    }

    const categories = await db.category.findMany({
      where: {
        brandId: ctx.brandId,
        OR: [{ branchId }, { branchId: null }],
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        products: {
          where: {
            brandId: ctx.brandId,
            OR: [{ branchId }, { branchId: null }],
            isAvailable: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            optionGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    return apiSuccess(categories);
  } catch (err) {
    return tenantCatch(err);
  }
}