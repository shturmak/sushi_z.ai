import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { orderId, courierId } = body;

    if (!orderId || !courierId) {
      return apiError('VALIDATION_ERROR', 'orderId and courierId required');
    }

    // Verify order exists
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return apiNotFound('Order not found');

    // Verify courier exists and is active
    const courier = await db.courier.findUnique({ where: { id: courierId } });
    if (!courier) return apiNotFound('Courier not found');

    // Check if order already has an assignment
    const existing = await db.deliveryAssignment.findUnique({ where: { orderId } });
    if (existing) {
      // Update the existing assignment with new courier
      await db.deliveryAssignment.update({
        where: { orderId },
        data: { courierId, status: 'assigned', assignedAt: new Date(), pickedUpAt: null, deliveredAt: null },
      });
      return apiSuccess({ success: true }, 'Courier reassigned');
    }

    await db.deliveryAssignment.create({
      data: {
        orderId,
        courierId,
        status: 'assigned',
      },
    });

    return apiSuccess({ success: true }, 'Courier assigned', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Assign courier error:', error);
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) return apiError('VALIDATION_ERROR', 'orderId required');

    const existing = await db.deliveryAssignment.findUnique({ where: { orderId } });
    if (!existing) return apiNotFound('No assignment found for this order');

    await db.deliveryAssignment.delete({ where: { orderId } });
    return apiSuccess({ success: true }, 'Assignment removed');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}