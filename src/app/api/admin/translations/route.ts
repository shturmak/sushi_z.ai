import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) return apiError('VALIDATION_ERROR', 'brandId is required', 400);

    const locale = request.nextUrl.searchParams.get('locale');
    const entityType = request.nextUrl.searchParams.get('entityType');

    const where: Record<string, unknown> = { brandId };
    if (locale) where.locale = locale;
    if (entityType) where.entityType = entityType;

    const translations = await db.menuTranslation.findMany({
      where,
      orderBy: [{ locale: 'asc' }, { entityType: 'asc' }],
    });

    // Batch-fetch original names
    const productIds = translations.filter(t => t.entityType === 'Product').map(t => t.entityId);
    const categoryIds = translations.filter(t => t.entityType === 'Category').map(t => t.entityId);

    const [products, categories] = await Promise.all([
      productIds.length
        ? db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
        : [],
      categoryIds.length
        ? db.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
        : [],
    ]);

    const nameMap = new Map<string, string>([
      ...products.map(p => [p.id, p.name]),
      ...categories.map(c => [c.id, c.name]),
    ]);

    const result = translations.map(t => ({
      ...t,
      originalName: nameMap.get(t.entityId) ?? '',
    }));

    return apiSuccess(result);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) return apiError('VALIDATION_ERROR', 'brandId is required', 400);

    const body = await request.json();
    const { locale, entityType, entityId, name, description } = body;

    if (!locale || !entityType || !entityId) {
      return apiError('VALIDATION_ERROR', 'locale, entityType, and entityId are required');
    }
    if (!['Product', 'Category'].includes(entityType)) {
      return apiError('VALIDATION_ERROR', 'entityType must be Product or Category');
    }

    const translation = await db.menuTranslation.upsert({
      where: {
        brandId_locale_entityType_entityId: {
          brandId,
          locale,
          entityType,
          entityId,
        },
      },
      create: {
        brandId,
        locale,
        entityType,
        entityId,
        name: name ?? null,
        description: description ?? null,
      },
      update: {
        name: name ?? null,
        description: description ?? null,
      },
    });

    return apiSuccess(translation, 'Translation saved', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}