import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET() {
  try {
    await requireAdmin();
    const branches = await db.branch.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { orders: true, categories: true } } },
    });
    return apiSuccess(branches);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, slug, address, phone, email, latitude, longitude, isOpen, workSchedule, description } = body;

    if (!name || !slug || !address) return apiError('VALIDATION_ERROR', 'name, slug, address required');

    const existing = await db.branch.findUnique({ where: { slug } });
    if (existing) return apiError('CONFLICT', 'Branch with this slug exists', 409);

    const branch = await db.branch.create({
      data: { name, slug, address, phone, email, latitude, longitude, isOpen: isOpen ?? true, workSchedule, description },
    });
    return apiSuccess(branch, 'Branch created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create branch error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}