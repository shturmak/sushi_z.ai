import { Request } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { page, limit } = parsePagination(new URL(request.url).searchParams, { limit: 50 });
    const search = new URL(request.url).searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };

    const [categories, total] = await Promise.all([
      db.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { branch: { select: { name: true } }, _count: { select: { products: true } } },
      }),
      db.category.count({ where }),
    ]);

    return apiSuccess(paginateResult(categories, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { branchId, name, slug, description, imageUrl, sortOrder } = body;
    if (!name || !slug) return apiError('VALIDATION_ERROR', 'name and slug required');

    const category = await db.category.create({
      data: { branchId: branchId || null, name, slug, description, imageUrl: imageUrl || null, sortOrder: sortOrder ?? 0 },
    });
    return apiSuccess(category, 'Category created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}