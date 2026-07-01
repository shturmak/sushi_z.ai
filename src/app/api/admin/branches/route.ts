import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const branches = await db.branch.findMany({
      where: { brandId: ctx.brandId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { orders: true, categories: true } } },
    });
    return apiSuccess(branches);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const body = await request.json();
    const { name, slug, address, phone, email, latitude, longitude, isOpen, workSchedule, description } = body;

    if (!name || !slug || !address) return apiError('VALIDATION_ERROR', 'name, slug, address required');

    const existing = await db.branch.findFirst({ where: { brandId: ctx.brandId, slug } });
    if (existing) return apiError('CONFLICT', 'Branch with this slug exists', 409);

    const branch = await db.branch.create({
      data: { brandId: ctx.brandId, name, slug, address, phone, email, latitude, longitude, isOpen: isOpen ?? true, workSchedule, description },
    });
    return apiSuccess(branch, 'Branch created', 201);
  } catch (err) {
    return tenantCatch(err);
  }
}