import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiNotFound } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true, optionGroups: { include: { options: true }, orderBy: { sortOrder: 'asc' } } },
    });
    if (!product || product.brandId !== ctx.brandId) return apiNotFound('Product not found');
    return apiSuccess(product);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Product not found');

    const body = await request.json();
    const { name, description, price, weight, calories, isAvailable, sortOrder, optionGroups } = body;

    await db.product.update({ where: { id }, data: { name, description, price, weight, calories, isAvailable, sortOrder } });

    // Rebuild option groups if provided
    if (optionGroups) {
      await db.productOption.deleteMany({ where: { group: { productId: id } } });
      await db.productOptionGroup.deleteMany({ where: { productId: id } });
      for (const g of optionGroups) {
        const group = await db.productOptionGroup.create({
          data: { productId: id, name: g.name, isRequired: g.isRequired ?? false, maxChoices: g.maxChoices ?? 1, sortOrder: g.sortOrder ?? 0 },
        });
        if (g.options) {
          for (const opt of g.options) {
            await db.productOption.create({
              data: { groupId: group.id, name: opt.name, priceDelta: opt.priceDelta ?? 0, sortOrder: opt.sortOrder ?? 0 },
            });
          }
        }
      }
    }

    const updated = await db.product.findUnique({ where: { id }, include: { optionGroups: { include: { options: true } } } });
    return apiSuccess(updated, 'Product updated');
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await withTenantAdmin(request);
    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id }, select: { brandId: true } });
    if (!existing || existing.brandId !== ctx.brandId) return apiNotFound('Product not found');

    await db.product.delete({ where: { id } });
    return apiSuccess(null, 'Product deleted');
  } catch (err) {
    return tenantCatch(err);
  }
}