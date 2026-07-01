import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id },
      include: { branch: { select: { name: true } }, _count: { select: { products: true } } },
    });
    if (!category || category.brandId !== ctx.brandId) return apiNotFound('Category not found');
    return apiSuccess(category);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.category.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Category not found');

    const body = await request.json();
    const category = await db.category.update({ where: { id }, data: body });
    return apiSuccess(category, 'Category updated');
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.category.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Category not found');

    await db.category.delete({ where: { id } });
    return apiSuccess(null, 'Category deleted');
  } catch (err) {
    return tenantCatch(err);
  }
}