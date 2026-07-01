import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isOpen = searchParams.get('isOpen');

    const where: Record<string, unknown> = {};
    if (isOpen !== null && isOpen !== undefined) {
      where.isOpen = isOpen === 'true';
    }

    const branches = await db.branch.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess(branches);
  } catch (error) {
    console.error('List branches error:', error);
    return apiSuccess([]);
  }
}