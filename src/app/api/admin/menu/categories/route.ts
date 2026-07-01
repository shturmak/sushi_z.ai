import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const categories = await db.category.findMany({
      where: { brandId: ctx.brandId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { branch: { select: { name: true } }, _count: { select: { products: true } } },
    });
    return apiSuccess(categories);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const body = await request.json();
    const { branchId, name, slug, description, sortOrder } = body;
    if (!name || !slug) return apiError('VALIDATION_ERROR', 'name and slug required');

    const category = await db.category.create({
      data: { brandId: ctx.brandId, branchId: branchId || null, name, slug, description, sortOrder: sortOrder ?? 0 },
    });
    return apiSuccess(category, 'Category created', 201);
  } catch (err) {
    return tenantCatch(err);
  }
}