import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const brandId = searchParams.get('brandId');
    const search = searchParams.get('search') || '';
    const tags = searchParams.get('tags'); // comma-separated
    const excludeAllergens = searchParams.get('excludeAllergens'); // comma-separated
    const vegetarian = searchParams.get('vegetarian'); // 'true' or empty
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!branchId && !brandId) {
      return apiError('VALIDATION_ERROR', 'branchId or brandId is required');
    }

    // Build where clause
    const where: Record<string, unknown> = {
      isAvailable: true,
      brandId: brandId || undefined,
      // branch filter: specific branch OR null (all branches)
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
    };

    // Price filter
    where.price = { gte: minPrice, ...(maxPrice < 999999 ? { lte: maxPrice } : {}) };

    // Search by name/description
    if (search) {
      where.OR = [
        ...(where.OR ? [where.OR] : []),
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Vegetarian filter
    if (vegetarian === 'true') {
      where.isVegetarian = true;
    }

    // Get all matching products, then filter by tags/allergens in JS
    // (JSON fields can't be easily queried in SQLite)
    let products = await db.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: limit,
      skip: offset,
      include: {
        category: { select: { id: true, name: true } },
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });

    // Client-side filtering for JSON fields (tags, allergens)
    if (tags || excludeAllergens) {
      const tagSet = tags ? new Set(tags.split(',').map(t => t.trim().toLowerCase())) : null;
      const excludeSet = excludeAllergens ? new Set(excludeAllergens.split(',').map(a => a.trim().toLowerCase())) : null;

      products = products.filter((p) => {
        const pTags: string[] = p.tags ? JSON.parse(p.tags) : [];
        const pAllergens: string[] = p.allergens ? JSON.parse(p.allergens) : [];

        if (tagSet && tagSet.size > 0) {
          const match = pTags.some(t => tagSet.has(t.toLowerCase()));
          if (!match) return false;
        }

        if (excludeSet && excludeSet.size > 0) {
          const hasExcluded = pAllergens.some(a => excludeSet.has(a.toLowerCase()));
          if (hasExcluded) return false;
        }

        return true;
      });
    }

    const total = await db.product.count({ where: { ...where, ...(search ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] } : {}) } });

    return apiSuccess({
      data: products,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Product search error:', error);
    return apiError('INTERNAL_ERROR', 'Search failed', 500);
  }
}