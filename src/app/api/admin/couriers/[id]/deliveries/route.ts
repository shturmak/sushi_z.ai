import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: courierId } = await params;
    const body = await request.json();
    const { assignmentId, status } = body;

    if (!assignmentId || !status) {
      return apiError('VALIDATION_ERROR', 'assignmentId and status required');
    }

    if (status !== 'picked_up' && status !== 'delivered') {
      return apiError('VALIDATION_ERROR', 'status must be picked_up or delivered');
    }

    // Verify assignment belongs to this courier
    const assignment = await db.deliveryAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) return apiNotFound('Assignment not found');
    if (assignment.courierId !== courierId) {
      return apiError('FORBIDDEN', 'Assignment does not belong to this courier', 403);
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'picked_up') {
      updateData.pickedUpAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
      // Also set pickedUpAt if not already set
      if (!assignment.pickedUpAt) {
        updateData.pickedUpAt = new Date();
      }
    }

    const updated = await db.deliveryAssignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return apiSuccess(updated, 'Delivery status updated');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}