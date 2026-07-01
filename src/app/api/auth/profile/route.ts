import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);

    const user = await db.user.findUnique({
      where: { id: ctx.user.userId },
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, isActive: true, createdAt: true },
    });

    if (!user) {
      return apiError('NOT_FOUND', 'User not found', 404);
    }

    const loyalty = await db.loyaltyAccount.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
    });

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
      loyalty: loyalty
        ? {
            balance: loyalty.balance,
            lifetime: loyalty.lifetime,
            tier: loyalty.tier,
          }
        : null,
    });
  } catch (err) {
    return tenantCatch(err);
  }
}