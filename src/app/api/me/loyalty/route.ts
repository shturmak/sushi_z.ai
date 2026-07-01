import { apiSuccess } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const authUser = await requireAuth();
    const loyalty = await db.loyaltyAccount.findUnique({ where: { userId: authUser.userId } });
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