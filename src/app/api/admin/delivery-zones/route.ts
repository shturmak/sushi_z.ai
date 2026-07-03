import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { parsePagination, paginateResult } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { page, limit } = parsePagination(request.nextUrl.searchParams, { limit: 50 });
    const branchId = request.nextUrl.searchParams.get('branchId');

    const where: Record<string, unknown> = {};
    if (branchId) where.branchId = branchId;

    const [zones, total] = await Promise.all([
      db.deliveryZone.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { branch: { select: { name: true } } },
      }),
      db.deliveryZone.count({ where }),
    ]);

    return apiSuccess(paginateResult(zones, total, page, limit));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, branchId, description, minOrder, deliveryFee, estimatedMinutes, polygonData, isActive } = body;

    if (!name || !branchId) return apiError('VALIDATION_ERROR', 'name and branchId required');

    // Verify branch exists
    const branch = await db.branch.findUnique({ where: { id: branchId } });
    if (!branch) return apiError('NOT_FOUND', 'Branch not found', 404);

    const zone = await db.deliveryZone.create({
      data: {
        name,
        branchId,
        description: description ?? null,
        minOrder: minOrder ?? 0,
        deliveryFee: deliveryFee ?? 0,
        estimatedMinutes: estimatedMinutes ?? 30,
        polygonData: polygonData ?? null,
        isActive: isActive ?? true,
      },
      include: { branch: { select: { name: true } } },
    });
    return apiSuccess(zone, 'Delivery zone created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create delivery zone error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}