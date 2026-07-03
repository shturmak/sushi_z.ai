import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 50 });
    const search = request.nextUrl.searchParams.get('search');
    const categoryId = request.nextUrl.searchParams.get('categoryId');

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (categoryId) where.categoryId = categoryId;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { category: { select: { name: true } }, branch: { select: { name: true } }, optionGroups: { include: { options: true } } },
      }),
      db.product.count({ where }),
    ]);

    return apiSuccess(paginateResult(products, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { categoryId, branchId, name, slug, description, imageUrl, price, weight, calories, isVegetarian, isAvailable, tags, allergens, sortOrder, optionGroups } = body;

    if (!categoryId || !name || !slug || price == null)
      return apiError('VALIDATION_ERROR', 'categoryId, name, slug, price required');

    // Convert comma-separated tags/allergens to JSON arrays
    const tagsJson = tags ? JSON.stringify(tags.split(',').map((t: string) => t.trim()).filter(Boolean)) : null;
    const allergensJson = allergens ? JSON.stringify(allergens.split(',').map((a: string) => a.trim()).filter(Boolean)) : null;

    const product = await db.product.create({
      data: {
        categoryId, branchId: branchId || null, name, slug, description,
        imageUrl: imageUrl || null,
        price, weight, calories,
        isVegetarian: isVegetarian ?? false,
        isAvailable: isAvailable ?? true,
        tags: tagsJson,
        allergens: allergensJson,
        sortOrder: sortOrder ?? 0,
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
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create product error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}