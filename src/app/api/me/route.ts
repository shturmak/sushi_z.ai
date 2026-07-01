import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withTenantAuth, tenantCatch } from '@/lib/tenant-middleware';

export async function GET(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);
    const user = await db.user.findUnique({
      where: { id: ctx.user.userId },
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return apiError('NOT_FOUND', 'User not found', 404);
    return apiSuccess(user);
  } catch (err) {
    return tenantCatch(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await withTenantAuth(request);
    const body = await request.json();
    const { firstName, lastName, email } = body;

    const updateData: Record<string, string> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing && existing.id !== ctx.user.userId) return apiError('CONFLICT', 'Email already taken', 409);
      updateData.email = email;
    }

    const user = await db.user.update({
      where: { id: ctx.user.userId },
      data: updateData,
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true },
    });
    return apiSuccess(user, 'Profile updated');
  } catch (err) {
    return tenantCatch(err);
  }
}