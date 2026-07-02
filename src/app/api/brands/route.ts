import { db } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';

export async function GET() {
  try {
    const brands = await db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return apiSuccess(brands);
  } catch (error) {
    console.error('List brands error:', error);
    return apiSuccess([]);
  }
}