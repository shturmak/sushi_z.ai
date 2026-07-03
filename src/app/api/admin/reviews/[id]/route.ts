import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';

// PUT /api/admin/reviews/[id] — approve/reject, add reply
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { isApproved, isAdminReply } = body;

    const review = await db.review.findUnique({ where: { id } });
    if (!review) return apiNotFound('Review not found');

    const data: Record<string, unknown> = {};
    if (typeof isApproved === 'boolean') data.isApproved = isApproved;
    if (typeof isAdminReply === 'string') data.isAdminReply = isAdminReply;

    if (Object.keys(data).length === 0) {
      return apiError('VALIDATION_ERROR', 'No fields to update');
    }

    const updated = await db.review.update({
      where: { id },
      data,
      include: {
        user: { select: { firstName: true, lastName: true } },
        product: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}

// DELETE /api/admin/reviews/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const review = await db.review.findUnique({ where: { id } });
    if (!review) return apiNotFound('Review not found');

    await db.review.delete({ where: { id } });
    return apiSuccess(null, 'Review deleted');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed', 500);
  }
}