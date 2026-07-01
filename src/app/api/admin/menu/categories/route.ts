import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET() {
  try {
    await requireAdmin();
    const categories = await db.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { branch: { select: { name: true } }, _count: { select: { products: true } } },
    });
    return apiSuccess(categories);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { branchId, name, slug, description, sortOrder } = body;
    if (!name || !slug) return apiError('VALIDATION_ERROR', 'name and slug required');

    const category = await db.category.create({
      data: { branchId: branchId || null, name, slug, description, sortOrder: sortOrder ?? 0 },
    });
    return apiSuccess(category, 'Category created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}