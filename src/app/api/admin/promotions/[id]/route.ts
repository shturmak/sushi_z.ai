import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const promo = await db.promotion.findUnique({ where: { id } });
    if (!promo || promo.brandId !== ctx.brandId) return apiNotFound('Promotion not found');
    return apiSuccess(promo);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.promotion.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Promotion not found');

    const body = await request.json();
    const promo = await db.promotion.update({ where: { id }, data: body });
    return apiSuccess(promo, 'Promotion updated');
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.promotion.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Promotion not found');

    await db.promotion.delete({ where: { id } });
    return apiSuccess(null, 'Promotion deleted');
  } catch (err) {
    return tenantCatch(err);
  }
}