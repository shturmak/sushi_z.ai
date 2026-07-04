import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    if (!branchId) {
      return apiError('VALIDATION_ERROR', 'branchId query parameter is required');
    }

    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return apiError('NOT_FOUND', 'Branch not found', 404);
    }

    if (!branch.acceptingOrders) {
      return apiError('NOT_ACCEPTING', 'This branch is not accepting orders right now', 403);
    }

    const categories = await db.category.findMany({
      where: {
        OR: [{ branchId }, { branchId: null }],
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        products: {
          where: {
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
  } catch (error) {
    console.error('Get menu error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to load menu', 500);
  }
}