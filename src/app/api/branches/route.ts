import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { publicLimiter, rateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rl = publicLimiter('branches:' + ip);
    if (!rl.success) {
      return apiError('RATE_LIMITED', 'Too many requests', 429, undefined, rateLimitHeaders(rl));
    }

    const { searchParams } = new URL(request.url);
    const isOpen = searchParams.get('isOpen');

    const where: Record<string, unknown> = {};
    if (isOpen !== null && isOpen !== undefined) {
      where.isOpen = isOpen === 'true';
    }

    const branches = await db.branch.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess(branches, undefined, undefined, rateLimitHeaders(rl));
  } catch (error) {
    console.error('List branches error:', error);
    return apiSuccess([]);
  }
}