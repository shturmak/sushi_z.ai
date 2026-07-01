import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const promotions = await db.promotion.findMany({
      where: { brandId: ctx.brandId },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess(promotions);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const body = await request.json();
    const { code, name, description, type, value, minOrder, maxUses, startDate, endDate } = body;

    if (!name || !type || value == null || !startDate || !endDate)
      return apiError('VALIDATION_ERROR', 'name, type, value, startDate, endDate required');

    const promo = await db.promotion.create({
      data: {
        brandId: ctx.brandId,
        code: code || null,
        name, description, type, value,
        minOrder: minOrder ?? 0,
        maxUses: maxUses ?? null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    return apiSuccess(promo, 'Promotion created', 201);
  } catch (err) {
    return tenantCatch(err);
  }
}