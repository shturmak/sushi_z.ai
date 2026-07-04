import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const courier = await db.courier.findUnique({
      where: { id },
      include: {
        deliveryAssignments: {
          include: {
            order: {
              select: { orderNumber: true, status: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!courier) return apiNotFound('Courier not found');
    return apiSuccess(courier);
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
    const { name, phone, isActive } = body;

    const courier = await db.courier.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return apiSuccess(courier, 'Courier updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check for active assignments
    const activeCount = await db.deliveryAssignment.count({
      where: {
        courierId: id,
        status: { in: ['assigned', 'picked_up'] },
      },
    });

    if (activeCount > 0) {
      return apiError('VALIDATION_ERROR', 'Cannot delete courier with active deliveries', 400);
    }

    await db.courier.delete({ where: { id } });
    return apiSuccess(null, 'Courier deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}