import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiUnauthorized } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return apiUnauthorized('Refresh token is required');
    }

    await db.userSession.deleteMany({ where: { refreshToken } });

    return apiSuccess(null, 'Logged out successfully');
  } catch (error: unknown) {
    console.error('Logout error:', error);
    return apiSuccess(null, 'Logged out successfully');
  }
}