import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const branch = await db.branch.findUnique({ where: { id } });
    if (!branch) {
      return apiNotFound('Branch not found');
    }

    const zones = await db.deliveryZone.findMany({
      where: { branchId: id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess(zones);
  } catch (error) {
    console.error('List delivery zones error:', error);
    return apiSuccess([]);
  }
}