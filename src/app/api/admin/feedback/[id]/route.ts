import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { Prisma } from '@prisma/client';

const VALID_STATUSES = ['new', 'in_progress', 'resolved', 'closed'];

// GET /api/admin/feedback/[id] — single feedback with full relations
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const feedback = await db.feedback.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        branch: { select: { name: true } },
        order: { select: { orderNumber: true } },
        brand: { select: { name: true } },
      },
    });

    if (!feedback) return apiNotFound('Feedback not found');

    return apiSuccess(feedback);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed to fetch feedback', 500);
  }
}

// PATCH /api/admin/feedback/[id] — update status and/or adminReply
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { status, adminReply } = body;

    const existing = await db.feedback.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Feedback not found');

    const data: Prisma.FeedbackUpdateInput = {};

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return apiError('VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`);
      }
      data.status = status;
    }

    if (adminReply !== undefined) {
      data.adminReply = typeof adminReply === 'string' ? adminReply.trim() || null : null;
    }

    if (Object.keys(data).length === 0) {
      return apiError('VALIDATION_ERROR', 'No fields to update');
    }

    const updated = await db.feedback.update({
      where: { id },
      data,
      include: {
        user: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    return apiSuccess(updated);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    return apiError('INTERNAL_ERROR', 'Failed to update feedback', 500);
  }
}