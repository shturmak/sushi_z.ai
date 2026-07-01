import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);
    const loyalty = await db.loyaltyAccount.findUnique({
      where: { userId_brandId: { userId: ctx.user.userId, brandId: ctx.brandId } },
    });
    if (!loyalty) return apiSuccess([]);

    const transactions = await db.loyaltyTransaction.findMany({
      where: { accountId: loyalty.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return apiSuccess(transactions);
  } catch (err) {
    return tenantCatch(err);
  }
}