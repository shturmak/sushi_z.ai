import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const branch = await db.branch.findUnique({
      where: { id },
      include: { deliveryZones: true, _count: { select: { orders: true } } },
    });
    if (!branch || branch.brandId !== ctx.brandId) return apiNotFound('Branch not found');
    return apiSuccess(branch);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.branch.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Branch not found');

    const body = await request.json();
    const branch = await db.branch.update({ where: { id }, data: body });
    return apiSuccess(branch, 'Branch updated');
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.branch.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Branch not found');

    await db.branch.delete({ where: { id } });
    return apiSuccess(null, 'Branch deleted');
  } catch (err) {
    return tenantCatch(err);
  }
}