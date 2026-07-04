import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAuthUser } from '@/lib/auth-middleware';

const VALID_TYPES = ['order_issue', 'general', 'suggestion', 'complaint'];

// POST /api/feedback — create a new feedback entry
export async function POST(request: NextRequest) {
  try {
    // Optionally authenticate user
    const authUser = await getAuthUser();

    const body = await request.json();
    const { type, subject, message, contactInfo, orderId, branchId } = body;

    // Validate required fields
    if (!message || typeof message !== 'string' || !message.trim()) {
      return apiError('VALIDATION_ERROR', 'message is required');
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return apiError('VALIDATION_ERROR', `type must be one of: ${VALID_TYPES.join(', ')}`);
    }

    // Get brandId from query param
    const brandId = request.nextUrl.searchParams.get('brandId');
    if (!brandId) {
      return apiError('VALIDATION_ERROR', 'brandId query param is required');
    }

    const feedback = await db.feedback.create({
      data: {
        userId: authUser?.userId ?? null,
        brandId,
        branchId: branchId || null,
        orderId: orderId || null,
        type,
        status: 'new',
        subject: subject?.trim() || null,
        message: message.trim(),
        contactInfo: contactInfo?.trim() || null,
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    return apiSuccess(feedback, 'Feedback submitted successfully', 201);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Create feedback error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to submit feedback', 500);
  }
}