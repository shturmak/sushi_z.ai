import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const product = await db.product.findUnique({ where: { id }, include: { category: true, optionGroups: { include: { options: true }, orderBy: { sortOrder: 'asc' } } } });
    if (!product) return apiNotFound('Product not found');
    return apiSuccess(product);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name, description, imageUrl, price, weight, calories, isVegetarian, isAvailable, tags, allergens, sortOrder, optionGroups } = body;

    // Convert comma-separated tags/allergens to JSON arrays
    const tagsJson = tags !== undefined ? (tags ? JSON.stringify(tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : null) : undefined;
    const allergensJson = allergens !== undefined ? (allergens ? JSON.stringify(allergens.split(',').map((a: string) => a.trim()).filter(Boolean)) : null) : undefined;

    const updateData: Record<string, unknown> = { name, description, imageUrl: imageUrl || null, price, weight, calories, sortOrder };
    if (isVegetarian !== undefined) updateData.isVegetarian = isVegetarian;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (tagsJson !== undefined) updateData.tags = tagsJson;
    if (allergensJson !== undefined) updateData.allergens = allergensJson;

    await db.product.update({ where: { id }, data: updateData });

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
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { isAvailable } = body as { isAvailable?: boolean };

    if (typeof isAvailable !== 'boolean') {
      return apiError('VALIDATION_ERROR', 'isAvailable (boolean) is required', 400);
    }

    const updated = await db.product.update({
      where: { id },
      data: { isAvailable },
      include: { category: true, optionGroups: { include: { options: true }, orderBy: { sortOrder: 'asc' } } },
    });

    return apiSuccess(updated, 'Product availability updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.product.delete({ where: { id } });
    return apiSuccess(null, 'Product deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}