import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess } from '@/lib/api-response';
import { withTenant, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenant(request);
    const now = new Date();

    const promotions = await db.promotion.findMany({
      where: {
        brandId: ctx.brandId,
        status: 'active',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [{ startDate: 'desc' }],
    });

    return apiSuccess(promotions);
  } catch (err) {
    return tenantCatch(err);
  }
}