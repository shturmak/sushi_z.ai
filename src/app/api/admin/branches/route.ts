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

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };

    const [branches, total] = await Promise.all([
      db.branch.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { orders: true, categories: true } } },
      }),
      db.branch.count({ where }),
    ]);

    return apiSuccess(paginateResult(branches, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, slug, address, phone, email, latitude, longitude, isOpen, workSchedule, description, autoConfirm, acceptingOrders, minOrderAmount, prepTimeMinutes } = body;

    if (!name || !slug || !address) return apiError('VALIDATION_ERROR', 'name, slug, address required');

    const existing = await db.branch.findUnique({ where: { slug } });
    if (existing) return apiError('CONFLICT', 'Branch with this slug exists', 409);

    const branch = await db.branch.create({
      data: { name, slug, address, phone, email, latitude, longitude, isOpen: isOpen ?? true, workSchedule, description, autoConfirm: autoConfirm ?? false, acceptingOrders: acceptingOrders ?? true, minOrderAmount: minOrderAmount ?? 0, prepTimeMinutes: prepTimeMinutes ?? 30 },
    });
    return apiSuccess(branch, 'Branch created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create branch error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}