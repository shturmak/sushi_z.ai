import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, password, firstName, lastName, brandId } = body;

    if (!password) {
      return apiError('VALIDATION_ERROR', 'Password is required');
    }

    if (!phone && !email) {
      return apiError('VALIDATION_ERROR', 'Phone or email is required');
    }

    if (email) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return apiError('CONFLICT', 'Email already registered', 409);
      }
    }

    if (phone) {
      const existing = await db.user.findUnique({ where: { phone } });
      if (existing) {
        return apiError('CONFLICT', 'Phone already registered', 409);
      }
    }

    const passwordHash = hashPassword(password);

    const user = await db.user.create({
      data: {
        phone: phone || null,
        email: email || null,
        passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
      },
    });

    const loyaltyAccount = await db.loyaltyAccount.create({
      data: {
        userId: user.id,
        brandId: brandId || '',
      },
    });

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

    return apiSuccess(
      {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        loyalty: {
          balance: loyaltyAccount.balance,
          tier: loyaltyAccount.tier,
        },
        accessToken,
        refreshToken,
      },
      'Registration successful',
      201
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) return error as Response;
    console.error('Register error:', error);
    return apiError('INTERNAL_ERROR', 'Registration failed', 500);
  }
}