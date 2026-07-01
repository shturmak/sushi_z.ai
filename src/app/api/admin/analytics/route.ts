import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { getAdminAnalytics } from '@/domain/analytics.service';

export async function GET() {
  try {
    await requireAdmin();
    const analytics = await getAdminAnalytics();
    return apiSuccess(analytics);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Analytics error:', error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch analytics', 500);
  }
}