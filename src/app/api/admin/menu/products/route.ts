import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAdmin, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const products = await db.product.findMany({
      where: { brandId: ctx.brandId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { category: { select: { name: true } }, branch: { select: { name: true } }, optionGroups: { include: { options: true } } },
    });
    return apiSuccess(products);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await withTenantAdmin(request);
    const body = await request.json();
    const { categoryId, branchId, name, slug, description, price, weight, calories, isAvailable, sortOrder, optionGroups } = body;

    if (!categoryId || !name || !slug || price == null)
      return apiError('VALIDATION_ERROR', 'categoryId, name, slug, price required');

    const product = await db.product.create({
      data: {
        brandId: ctx.brandId,
        categoryId, branchId: branchId || null, name, slug, description,
        price, weight, calories, isAvailable: isAvailable ?? true, sortOrder: sortOrder ?? 0,
      },
    });

    // Create option groups + options if provided
    if (optionGroups && Array.isArray(optionGroups)) {
      for (const g of optionGroups) {
        const group = await db.productOptionGroup.create({
          data: { productId: product.id, name: g.name, isRequired: g.isRequired ?? false, maxChoices: g.maxChoices ?? 1, sortOrder: g.sortOrder ?? 0 },
        });
        if (g.options && Array.isArray(g.options)) {
          for (const opt of g.options) {
            await db.productOption.create({
              data: { groupId: group.id, name: opt.name, priceDelta: opt.priceDelta ?? 0, sortOrder: opt.sortOrder ?? 0 },
            });
          }
        }
      }
    }

    const created = await db.product.findUnique({ where: { id: product.id }, include: { optionGroups: { include: { options: true } } } });
    return apiSuccess(created, 'Product created', 201);
  } catch (err) {
    return tenantCatch(err);
  }
}