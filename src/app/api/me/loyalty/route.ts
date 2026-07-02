import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const brandId = request.nextUrl.searchParams.get('brandId') || '';
    const loyalty = await db.loyaltyAccount.findUnique({ where: { userId_brandId: { userId: authUser.userId, brandId } } });
    if (!loyalty) {
      return apiSuccess({ balance: 0, lifetime: 0, tier: 'bronze' });
    }
    return apiSuccess(loyalty);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Loyalty error:', error);
    return apiSuccess({ balance: 0, lifetime: 0, tier: 'bronze' });
  }
}