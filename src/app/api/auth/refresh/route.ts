import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
import { generateAccessToken, verifyRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return apiUnauthorized('Refresh token is required');
    }

    const isValid = await verifyRefreshToken(refreshToken);
    if (!isValid) {
      return apiUnauthorized('Invalid or expired refresh token');
    }

    const session = await db.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      return apiUnauthorized('Session not found');
    }

    if (session.expiresAt < new Date()) {
      await db.userSession.delete({ where: { id: session.id } });
      return apiUnauthorized('Refresh token expired');
    }

    const accessToken = await generateAccessToken({
      userId: session.user.id,
      role: session.user.role,
      phone: session.user.phone || undefined,
      email: session.user.email || undefined,
    });

    return apiSuccess({ accessToken });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Refresh error:', error);
    return apiError('INTERNAL_ERROR', 'Token refresh failed', 500);
  }
}