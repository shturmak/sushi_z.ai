import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) return apiError('VALIDATION_ERROR', 'brandId required');

    const couriers = await db.courier.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            deliveryAssignments: true,
          },
        },
      },
    });

    // Compute activeOrders count (assigned + picked_up)
    const withCounts = await Promise.all(
      couriers.map(async (c) => {
        const activeOrders = await db.deliveryAssignment.count({
          where: {
            courierId: c.id,
            status: { in: ['assigned', 'picked_up'] },
          },
        });
        return {
          ...c,
          activeOrders,
          totalDeliveries: c._count.deliveryAssignments,
        };
      }),
    );

    return apiSuccess(withCounts);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) return apiError('VALIDATION_ERROR', 'brandId required');

    const body = await request.json();
    const { name, phone } = body;

    if (!name?.trim()) return apiError('VALIDATION_ERROR', 'name required');

    const courier = await db.courier.create({
      data: {
        brandId,
        name: name.trim(),
        phone: phone?.trim() || null,
      },
    });

    return apiSuccess(courier, 'Courier created', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create courier error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}