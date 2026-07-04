import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { requireAdmin } from '@/lib/auth-middleware';
import { getAdminAnalytics } from '@/domain/analytics.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const period = request.nextUrl.searchParams.get('period');
    const dateFromStr = request.nextUrl.searchParams.get('dateFrom');
    const dateToStr = request.nextUrl.searchParams.get('dateTo');

    let range: { dateFrom?: Date; dateTo?: Date } | undefined;

    if (dateFromStr || dateToStr) {
      range = {};
      if (dateFromStr) range.dateFrom = new Date(dateFromStr);
      if (dateToStr) {
        const to = new Date(dateToStr);
        to.setHours(23, 59, 59, 999);
        range.dateTo = to;
      }
    } else if (period) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      range = {};

      switch (period) {
        case 'today':
          range.dateFrom = todayStart;
          range.dateTo = now;
          break;
        case '7d':
          range.dateFrom = new Date(todayStart);
          range.dateFrom.setDate(range.dateFrom.getDate() - 7);
          range.dateTo = now;
          break;
        case '30d':
          range.dateFrom = new Date(todayStart);
          range.dateFrom.setDate(range.dateFrom.getDate() - 30);
          range.dateTo = now;
          break;
        case 'month':
          range.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          range.dateTo = now;
          break;
      }
    }

    const analytics = await getAdminAnalytics(range);
    return apiSuccess(analytics);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    logger.error('Analytics error', undefined, error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch analytics', 500);
  }
}