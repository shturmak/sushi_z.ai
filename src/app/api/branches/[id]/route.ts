import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    if (!branch) {
      return apiNotFound('Branch not found');
    }

    return apiSuccess(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    return apiNotFound('Branch not found');
  }
}