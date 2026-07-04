import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, verifyPassword } from '@/lib/auth';
import { authLimiter, rateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rl = authLimiter('login:' + ip);
    if (!rl.success) {
      return apiError('RATE_LIMITED', 'Too many requests', 429, undefined, rateLimitHeaders(rl));
    }

    const body = await request.json();
    const { email, phone, password } = body;

    if (!password) {
      return apiError('VALIDATION_ERROR', 'Password is required');
    }

    if (!email && !phone) {
      return apiError('VALIDATION_ERROR', 'Email or phone is required');
    }

    const user = email
      ? await db.user.findUnique({ where: { email }, include: { loyaltyAccounts: { take: 1 } } })
      : await db.user.findUnique({ where: { phone }, include: { loyaltyAccounts: { take: 1 } } });

    if (!user) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email/phone or password', 401);
    }

    if (!user.isActive) {
      return apiError('ACCOUNT_DISABLED', 'Account is disabled', 403);
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return apiError('INVALID_CREDENTIALS', 'Invalid email/phone or password', 401);
    }

    const accessToken = await generateAccessToken({
      userId: user.id,
      role: user.role,
      phone: user.phone || undefined,
      email: user.email || undefined,
    });

    const refreshToken = await generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return apiSuccess({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      loyalty: {
        balance: user.loyaltyAccounts?.[0]?.balance ?? 0,
        tier: user.loyaltyAccounts?.[0]?.tier ?? 'bronze',
      },
      accessToken,
      refreshToken,
    }, undefined, undefined, rateLimitHeaders(rl));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Login error:', error);
    return apiError('INTERNAL_ERROR', 'Login failed', 500);
  }
}