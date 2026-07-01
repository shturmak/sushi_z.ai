import { db } from '@/lib/db';
import { apiSuccess, apiUnauthorized } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  try {
    const authUser = await requireAuth();

    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      include: { loyaltyAccount: true },
    });

    if (!user) {
      return apiUnauthorized('User not found');
    }

    return apiSuccess({
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      loyalty: user.loyaltyAccount
        ? {
            balance: user.loyaltyAccount.balance,
            lifetime: user.loyaltyAccount.lifetime,
            tier: user.loyaltyAccount.tier,
          }
        : null,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Profile error:', error);
    return apiUnauthorized();
  }
}